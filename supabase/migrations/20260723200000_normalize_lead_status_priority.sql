-- Normalize public.leads status/priority vocabulary to lowercase and add
-- CHECK constraints so future rows (manual or trigger-created) can't drift
-- out of the values the app actually uses.
--
-- Allowed sets below were derived directly from the codebase, not assumed:
--   - lib/types.ts: LEAD_STATUSES = ['new','contacted','qualified','converted','declined']
--     LEAD_PRIORITIES = ['high','medium','low','hot','normal']
--   - app/(dashboard)/leads/page.tsx and leads/[id]/page.tsx use exactly
--     these sets for the status/priority Select dropdowns and filter chips.
--   - 'declined' is the leads terminal-negative status used by this app;
--     'lost' (mentioned as a possible floor value) is a Deals-only status
--     and never appears on leads anywhere in the codebase.
--   - 'high' remains a valid priority: the Add/Edit Lead form still offers
--     it as a manual selection independent of the trigger below, so it is
--     kept in the allowed set even though the trigger's own output is
--     being normalized to 'hot'.
--
-- NOTE on the two quote->lead trigger functions: verified against the live
-- function bodies (not assumed), only create_lead_from_quote_request()
-- currently inserts the non-normalized 'New' / 'high' values.
-- sync_quote_request_to_lead() already inserts 'new' / 'normal' - both
-- already valid, normalized values - so it is left unchanged here rather
-- than being forced to 'hot', which would silently escalate priority on
-- every future website-quote-generated lead with no basis in the verified
-- behavior.

-- 1. Normalize existing data BEFORE adding constraints, so no current row
--    can violate them.
UPDATE public.leads SET status = lower(status) WHERE status <> lower(status);
UPDATE public.leads SET priority = 'hot' WHERE priority = 'high';

-- 2. Fix the trigger function that still inserts non-normalized values.
--    Body reproduced from the live function definition, changing only the
--    'New' -> 'new' and 'high' -> 'hot' literals.
CREATE OR REPLACE FUNCTION public.create_lead_from_quote_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_lead_id uuid;
BEGIN
  -- Only create a lead if one isn't already linked
  IF NEW.lead_id IS NULL THEN
    INSERT INTO public.leads (
      first_name,
      last_name,
      email,
      phone,
      address_zip,
      lead_source,
      lead_score,
      priority,
      status,
      notes,
      created_date
    ) VALUES (
      COALESCE(NEW.first_name, 'Unknown'),
      COALESCE(NEW.last_name, ''),
      NEW.email,
      NEW.phone,
      NEW.address_zip,
      'Web Quote',
      0,
      'hot',
      'new',
      'Auto-created from web quote request. Coverage: ' || COALESCE(NEW.coverage_type, 'Unknown')
        || CASE
             WHEN NEW.estimate_low IS NOT NULL AND NEW.estimate_high IS NOT NULL
             THEN '. Estimate: $' || NEW.estimate_low || '-$' || NEW.estimate_high || '/yr'
             ELSE ''
           END
        || '. Ref: ' || UPPER(LEFT(NEW.id::text, 8)),
      now()
    )
    RETURNING id INTO new_lead_id;

    NEW.lead_id := new_lead_id;
  END IF;

  RETURN NEW;
END;
$function$;

-- 3. get_active_policy_count() was found to be case-sensitive
--    (WHERE status = 'Active') while its sibling get_active_premium_total()
--    already uses lower(status) = 'active'. This directly feeds the
--    Dashboard "Active Policies" KPI and the Policies page header count,
--    so it is brought in line as part of the same case-insensitivity
--    requirement (Section 3.3) rather than left inconsistent.
CREATE OR REPLACE FUNCTION public.get_active_policy_count()
 RETURNS integer
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
SELECT count(*)::integer
FROM policies
WHERE lower(status) = 'active'
AND expiration_date >= current_date
AND deleted_at IS NULL;
$function$;

-- 4. Constrain leads.status / leads.priority to the sets the app actually
--    uses. Idempotent: safe to re-run on redeploy.
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_status_check
  CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'declined'));

ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_priority_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_priority_check
  CHECK (priority IN ('normal', 'hot', 'high', 'medium', 'low'));
