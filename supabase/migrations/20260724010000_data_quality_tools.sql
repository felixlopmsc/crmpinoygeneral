-- Data-quality tooling: schema helpers + staff-guarded RPCs backing the
-- /settings/data-quality admin page (client merge, carrier normalize, name fix).
--
-- Why RPCs: a merge must atomically repoint every FK that references
-- clients.id and soft-mark the losers in ONE transaction. The browser
-- Supabase client cannot run a multi-statement transaction, so the merge
-- (and, for consistent auditing, the carrier/name applies) live in
-- SECURITY DEFINER plpgsql functions guarded by public.is_staff().
--
-- Idempotent throughout (guards / OR REPLACE / IF NOT EXISTS).

-- 1. Allow the soft-merge sentinel status on clients.
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_status_check;
ALTER TABLE public.clients ADD CONSTRAINT clients_status_check
  CHECK (status = ANY (ARRAY['Lead','Active','Inactive','Archived','merged']));

-- 2. audit_log currently only models lead-gen runs. Add the generic
--    audit columns the data-quality tools need (all nullable, so existing
--    lead-gen inserts keep working), and give run_date a default.
ALTER TABLE public.audit_log ALTER COLUMN run_date SET DEFAULT now();
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS actor uuid;
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS action text;
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS affected_count integer;
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS target_table text;

-- Let staff read the audit log (previously RLS-enabled with no policy, so
-- nobody could SELECT it via the API). Writes still go through the
-- SECURITY DEFINER functions below / service role.
DROP POLICY IF EXISTS "Staff can read audit log" ON public.audit_log;
CREATE POLICY "Staff can read audit log" ON public.audit_log
  FOR SELECT TO authenticated USING (public.is_staff());

-- 3. Indexes only where missing: lower(email) for dedupe grouping, and the
--    FK columns the merge repoints that lacked a single-column index.
CREATE INDEX IF NOT EXISTS idx_clients_lower_email ON public.clients (lower(email));
CREATE INDEX IF NOT EXISTS idx_claims_client ON public.claims (client_id);
CREATE INDEX IF NOT EXISTS idx_client_profiles_client ON public.client_profiles (client_id);
CREATE INDEX IF NOT EXISTS idx_commissions_client ON public.commissions (client_id);
CREATE INDEX IF NOT EXISTS idx_documents_client ON public.documents (client_id);

-- 4. Read-only FK reference counts for the merge dry-run.
CREATE OR REPLACE FUNCTION public.client_ref_counts(p_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $fn$
BEGIN
  IF NOT is_staff() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN jsonb_build_object(
    'activities',               (SELECT count(*) FROM activities WHERE client_id = ANY(p_ids)),
    'claims',                   (SELECT count(*) FROM claims WHERE client_id = ANY(p_ids)),
    'client_profiles',          (SELECT count(*) FROM client_profiles WHERE client_id = ANY(p_ids)),
    'commissions',              (SELECT count(*) FROM commissions WHERE client_id = ANY(p_ids)),
    'cross_sell_opportunities', (SELECT count(*) FROM cross_sell_opportunities WHERE client_id = ANY(p_ids)),
    'deals',                    (SELECT count(*) FROM deals WHERE client_id = ANY(p_ids)),
    'documents',                (SELECT count(*) FROM documents WHERE client_id = ANY(p_ids)),
    'policies',                 (SELECT count(*) FROM policies WHERE client_id = ANY(p_ids)),
    'quote_requests',           (SELECT count(*) FROM quote_requests WHERE client_id = ANY(p_ids)),
    'renewal_log',              (SELECT count(*) FROM renewal_log WHERE client_id = ANY(p_ids)),
    'renewals',                 (SELECT count(*) FROM renewals WHERE client_id = ANY(p_ids)),
    'tasks',                    (SELECT count(*) FROM tasks WHERE related_client_id = ANY(p_ids))
  );
END;
$fn$;

-- 5. Merge duplicate clients: repoint all FKs from losers -> survivor, union
--    tags, concatenate notes, soft-mark losers 'merged'. One transaction.
CREATE OR REPLACE FUNCTION public.merge_clients(
  p_survivor uuid,
  p_losers uuid[],
  p_overrides jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $fn$
DECLARE
  v_actor uuid := auth.uid();
  v_counts jsonb := '{}'::jsonb;
  v_n int;
  v_total int := 0;
  v_audit_id bigint;
  v_new_status text;
BEGIN
  IF NOT is_staff() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_survivor IS NULL OR p_losers IS NULL OR array_length(p_losers, 1) IS NULL THEN
    RAISE EXCEPTION 'survivor and at least one loser are required';
  END IF;
  IF p_survivor = ANY(p_losers) THEN
    RAISE EXCEPTION 'cannot merge a client into itself';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM clients WHERE id = p_survivor AND status <> 'merged') THEN
    RAISE EXCEPTION 'survivor % not found or already merged', p_survivor;
  END IF;

  v_new_status := CASE WHEN p_overrides ? 'status' THEN p_overrides->>'status' ELSE NULL END;
  IF v_new_status = 'merged' THEN
    RAISE EXCEPTION 'cannot set survivor status to merged';
  END IF;

  -- Apply per-field chosen values to the survivor (key presence honored).
  UPDATE clients c SET
    first_name     = CASE WHEN p_overrides ? 'first_name'     THEN p_overrides->>'first_name' ELSE first_name END,
    last_name      = CASE WHEN p_overrides ? 'last_name'      THEN p_overrides->>'last_name'  ELSE last_name  END,
    email          = CASE WHEN p_overrides ? 'email'          THEN NULLIF(p_overrides->>'email','')   ELSE email END,
    phone          = CASE WHEN p_overrides ? 'phone'          THEN NULLIF(p_overrides->>'phone','')   ELSE phone END,
    phone_2        = CASE WHEN p_overrides ? 'phone_2'        THEN NULLIF(p_overrides->>'phone_2','') ELSE phone_2 END,
    date_of_birth  = CASE WHEN p_overrides ? 'date_of_birth'  THEN NULLIF(p_overrides->>'date_of_birth','')::date ELSE date_of_birth END,
    address_street = CASE WHEN p_overrides ? 'address_street' THEN p_overrides->>'address_street' ELSE address_street END,
    address_city   = CASE WHEN p_overrides ? 'address_city'   THEN p_overrides->>'address_city'   ELSE address_city END,
    address_state  = CASE WHEN p_overrides ? 'address_state'  THEN p_overrides->>'address_state'  ELSE address_state END,
    address_zip    = CASE WHEN p_overrides ? 'address_zip'    THEN p_overrides->>'address_zip'    ELSE address_zip END,
    source         = CASE WHEN p_overrides ? 'source'         THEN p_overrides->>'source'         ELSE source END,
    status         = COALESCE(v_new_status, status),
    updated_at     = now()
  WHERE c.id = p_survivor;

  -- Union tags from losers into survivor.
  UPDATE clients s SET tags = (
    SELECT ARRAY(
      SELECT DISTINCT tg FROM (
        SELECT unnest(coalesce(s.tags, '{}'::text[])) AS tg
        UNION ALL
        SELECT unnest(coalesce(l.tags, '{}'::text[])) FROM clients l WHERE l.id = ANY(p_losers)
      ) u WHERE tg IS NOT NULL AND tg <> ''
    )
  ) WHERE s.id = p_survivor;

  -- Concatenate notes with a "merged from" provenance line per loser.
  UPDATE clients s SET notes = coalesce(s.notes, '') || coalesce((
    SELECT string_agg(
      E'\n[merged from ' || l.id || ' (' || coalesce(l.first_name,'') || ' ' || coalesce(l.last_name,'') ||
      ', ' || coalesce(l.email,'no email') || ', ' || coalesce(l.phone,'no phone') || ') on ' || now()::date || ']' ||
      CASE WHEN coalesce(l.notes,'') <> '' THEN E'\n' || l.notes ELSE '' END,
      '' ORDER BY l.id)
    FROM clients l WHERE l.id = ANY(p_losers)
  ), '') WHERE s.id = p_survivor;

  -- Repoint every FK reference from losers -> survivor.
  UPDATE activities SET client_id = p_survivor WHERE client_id = ANY(p_losers);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('activities', v_n); v_total := v_total + v_n;
  UPDATE claims SET client_id = p_survivor WHERE client_id = ANY(p_losers);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('claims', v_n); v_total := v_total + v_n;
  UPDATE client_profiles SET client_id = p_survivor WHERE client_id = ANY(p_losers);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('client_profiles', v_n); v_total := v_total + v_n;
  UPDATE commissions SET client_id = p_survivor WHERE client_id = ANY(p_losers);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('commissions', v_n); v_total := v_total + v_n;
  UPDATE cross_sell_opportunities SET client_id = p_survivor WHERE client_id = ANY(p_losers);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('cross_sell_opportunities', v_n); v_total := v_total + v_n;
  UPDATE deals SET client_id = p_survivor WHERE client_id = ANY(p_losers);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('deals', v_n); v_total := v_total + v_n;
  UPDATE documents SET client_id = p_survivor WHERE client_id = ANY(p_losers);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('documents', v_n); v_total := v_total + v_n;
  UPDATE policies SET client_id = p_survivor WHERE client_id = ANY(p_losers);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('policies', v_n); v_total := v_total + v_n;
  UPDATE quote_requests SET client_id = p_survivor WHERE client_id = ANY(p_losers);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('quote_requests', v_n); v_total := v_total + v_n;
  UPDATE renewal_log SET client_id = p_survivor WHERE client_id = ANY(p_losers);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('renewal_log', v_n); v_total := v_total + v_n;
  UPDATE renewals SET client_id = p_survivor WHERE client_id = ANY(p_losers);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('renewals', v_n); v_total := v_total + v_n;
  UPDATE tasks SET related_client_id = p_survivor WHERE related_client_id = ANY(p_losers);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('tasks', v_n); v_total := v_total + v_n;

  -- Soft-mark losers. Null a loser's email only if it collides with the
  -- survivor's (unique partial index on non-empty email); otherwise keep it
  -- for reversibility. Identity is also preserved in the survivor's note.
  UPDATE clients SET
    status     = 'merged',
    email      = NULLIF(email, (SELECT email FROM clients WHERE id = p_survivor)),
    notes      = coalesce(notes, '') || E'\n[merged into ' || p_survivor || ' on ' || now()::date || ']',
    updated_at = now()
  WHERE id = ANY(p_losers);

  INSERT INTO audit_log (run_date, action, actor, affected_count, target_table, removed_duplicates, notes)
  VALUES (now(), 'merge_clients', v_actor, v_total, 'clients', array_length(p_losers, 1),
    'Merged ' || array_length(p_losers, 1) || ' record(s) into ' || p_survivor ||
    '. FK rows repointed: ' || v_total || ' ' || v_counts::text)
  RETURNING id INTO v_audit_id;

  RETURN jsonb_build_object(
    'survivor', p_survivor,
    'losers', to_jsonb(p_losers),
    'repointed', v_counts,
    'refs_repointed', v_total,
    'audit_id', v_audit_id
  );
END;
$fn$;

-- 6. Normalize a free-text carrier value across policies.
CREATE OR REPLACE FUNCTION public.apply_carrier_mapping(p_from text, p_to text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $fn$
DECLARE
  v_actor uuid := auth.uid();
  v_n int;
  v_audit_id bigint;
BEGIN
  IF NOT is_staff() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_to IS NULL OR btrim(p_to) = '' THEN
    RAISE EXCEPTION 'target carrier cannot be empty';
  END IF;
  IF p_from IS NULL THEN
    RAISE EXCEPTION 'source carrier is required';
  END IF;

  UPDATE policies SET carrier = p_to WHERE carrier = p_from;
  GET DIAGNOSTICS v_n = ROW_COUNT;

  INSERT INTO audit_log (run_date, action, actor, affected_count, target_table, notes)
  VALUES (now(), 'carrier_normalize', v_actor, v_n, 'policies',
    'Carrier "' || p_from || '" -> "' || p_to || '" (' || v_n || ' policies)')
  RETURNING id INTO v_audit_id;

  RETURN jsonb_build_object('affected', v_n, 'audit_id', v_audit_id);
END;
$fn$;

-- 7. Fix a doubled / malformed client name.
CREATE OR REPLACE FUNCTION public.apply_name_fix(p_id uuid, p_first text, p_last text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $fn$
DECLARE
  v_actor uuid := auth.uid();
  v_old text;
  v_audit_id bigint;
BEGIN
  IF NOT is_staff() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_first IS NULL OR btrim(p_first) = '' THEN
    RAISE EXCEPTION 'first name cannot be empty';
  END IF;

  SELECT coalesce(first_name,'') || ' ' || coalesce(last_name,'') INTO v_old
  FROM clients WHERE id = p_id;
  IF v_old IS NULL THEN
    RAISE EXCEPTION 'client % not found', p_id;
  END IF;

  UPDATE clients SET first_name = btrim(p_first), last_name = btrim(coalesce(p_last,'')), updated_at = now()
  WHERE id = p_id;

  INSERT INTO audit_log (run_date, action, actor, affected_count, target_table, notes)
  VALUES (now(), 'name_fix', v_actor, 1, 'clients',
    'Renamed client ' || p_id || ': "' || v_old || '" -> "' || btrim(p_first) || ' ' || btrim(coalesce(p_last,'')) || '"')
  RETURNING id INTO v_audit_id;

  RETURN jsonb_build_object('affected', 1, 'audit_id', v_audit_id);
END;
$fn$;

-- 8. Read helpers. These aggregate over the whole table server-side; the
--    browser client is capped at 1000 rows per request, so client-side
--    grouping would silently undercount. All staff-guarded.

-- Live counts for the three summary cards.
CREATE OR REPLACE FUNCTION public.dq_counts()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $fn$
BEGIN
  IF NOT is_staff() THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN jsonb_build_object(
    'dupes', (
      SELECT count(*) FROM (
        SELECT 1 FROM clients WHERE status <> 'merged'
        GROUP BY lower(btrim(coalesce(first_name,'') || ' ' || coalesce(last_name,'')))
        HAVING count(*) > 1
           AND lower(btrim(coalesce(first_name,'') || ' ' || coalesce(last_name,''))) <> ''
      ) d
    ),
    'carriers', (
      SELECT count(DISTINCT carrier) FROM policies
      WHERE deleted_at IS NULL AND nullif(btrim(carrier), '') IS NOT NULL
    ),
    'names', (
      SELECT count(*) FROM clients
      WHERE status <> 'merged'
        AND length(btrim(coalesce(last_name,''))) >= 3
        AND position(lower(btrim(last_name)) in lower(coalesce(first_name,''))) > 0
    )
  );
END;
$fn$;

-- Duplicate groups (name-normalized), with per-member arrays so the client
-- can surface same-email / same-phone signals without a second round trip.
CREATE OR REPLACE FUNCTION public.dq_duplicate_groups()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $fn$
DECLARE v jsonb;
BEGIN
  IF NOT is_staff() THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'norm', norm, 'ids', ids, 'statuses', statuses, 'emails', emails, 'phones', phones
         ) ORDER BY array_length(ids, 1) DESC), '[]'::jsonb)
  INTO v FROM (
    SELECT
      lower(btrim(coalesce(first_name,'') || ' ' || coalesce(last_name,''))) AS norm,
      array_agg(id) AS ids,
      array_agg(status) AS statuses,
      array_remove(array_agg(nullif(lower(btrim(email)), '')), NULL) AS emails,
      array_remove(array_agg(nullif(regexp_replace(coalesce(phone,''), '\D', '', 'g'), '')), NULL) AS phones
    FROM clients
    WHERE status <> 'merged'
    GROUP BY 1
    HAVING count(*) > 1
       AND lower(btrim(coalesce(first_name,'') || ' ' || coalesce(last_name,''))) <> ''
  ) q;
  RETURN v;
END;
$fn$;

-- Distinct free-text carriers with policy counts.
CREATE OR REPLACE FUNCTION public.dq_carrier_variants()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $fn$
DECLARE v jsonb;
BEGIN
  IF NOT is_staff() THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('carrier', carrier, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
  INTO v FROM (
    SELECT carrier, count(*) AS cnt FROM policies
    WHERE deleted_at IS NULL AND nullif(btrim(carrier), '') IS NOT NULL
    GROUP BY carrier
  ) q;
  RETURN v;
END;
$fn$;

-- Clients whose first name repeats the last name.
CREATE OR REPLACE FUNCTION public.dq_doubled_names()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $fn$
DECLARE v jsonb;
BEGIN
  IF NOT is_staff() THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'id', id, 'first_name', first_name, 'last_name', last_name, 'status', status
         ) ORDER BY first_name), '[]'::jsonb)
  INTO v FROM clients
  WHERE status <> 'merged'
    AND length(btrim(coalesce(last_name,''))) >= 3
    AND position(lower(btrim(last_name)) in lower(coalesce(first_name,''))) > 0;
  RETURN v;
END;
$fn$;

-- Restrict execute to authenticated (the is_staff() guard is the real gate).
REVOKE EXECUTE ON FUNCTION public.client_ref_counts(uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.merge_clients(uuid, uuid[], jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.apply_carrier_mapping(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.apply_name_fix(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.dq_counts() FROM anon;
REVOKE EXECUTE ON FUNCTION public.dq_duplicate_groups() FROM anon;
REVOKE EXECUTE ON FUNCTION public.dq_carrier_variants() FROM anon;
REVOKE EXECUTE ON FUNCTION public.dq_doubled_names() FROM anon;
