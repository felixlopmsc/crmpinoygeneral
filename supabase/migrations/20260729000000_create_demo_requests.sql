-- Demo / sales requests captured from the public CRM marketing landing page
-- (app/page.tsx). A prospect who clicks "Book a demo" / "Request pricing"
-- submits this form with the anon Supabase client, so the table needs the
-- same public-insert posture as public.quote_requests:
--   * anon + authenticated may INSERT, but only with status = 'New'
--     (WITH CHECK stops a hostile caller from seeding other statuses).
--   * only staff (public.is_staff()) may read / update.
-- No delete policy: rows are retained; staff can archive via status.
--
-- Idempotent throughout so it is safe to re-run.

CREATE TABLE IF NOT EXISTS public.demo_requests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz,
  status       text NOT NULL DEFAULT 'New'
               CHECK (status = ANY (ARRAY['New','Contacted','Demoed','Won','Lost'])),
  -- what the prospect told us on the landing page
  full_name    text,
  work_email   text,
  company      text,
  phone        text,
  team_size    text,          -- free-form bucket, e.g. "1-5 agents"
  interest     text,          -- 'demo' | 'pricing' | 'general' (soft, not constrained)
  message      text,
  source       text DEFAULT 'landing_page',
  -- staff-side triage
  internal_notes text,
  assigned_agent_id uuid REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_demo_requests_status  ON public.demo_requests (status);
CREATE INDEX IF NOT EXISTS idx_demo_requests_created ON public.demo_requests (created_at DESC);

-- keep updated_at fresh on staff edits (reuses the app's convention of a
-- generic touch trigger; create one locally if the shared helper is absent)
CREATE OR REPLACE FUNCTION public.touch_demo_requests_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_demo_requests_touch ON public.demo_requests;
CREATE TRIGGER trg_demo_requests_touch
  BEFORE UPDATE ON public.demo_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_demo_requests_updated_at();

ALTER TABLE public.demo_requests ENABLE ROW LEVEL SECURITY;

-- Public landing-page form (anon) may create a request, New only.
DROP POLICY IF EXISTS "Public can submit demo requests" ON public.demo_requests;
CREATE POLICY "Public can submit demo requests" ON public.demo_requests
  FOR INSERT TO anon
  WITH CHECK (status = 'New');

-- Signed-in visitors submitting the same form.
DROP POLICY IF EXISTS "Authenticated can submit demo requests" ON public.demo_requests;
CREATE POLICY "Authenticated can submit demo requests" ON public.demo_requests
  FOR INSERT TO authenticated
  WITH CHECK (status = 'New');

-- Only staff can read submitted requests.
DROP POLICY IF EXISTS "Staff can view demo requests" ON public.demo_requests;
CREATE POLICY "Staff can view demo requests" ON public.demo_requests
  FOR SELECT TO authenticated
  USING (public.is_staff());

-- Only staff can triage (status, notes, assignment).
DROP POLICY IF EXISTS "Staff can update demo requests" ON public.demo_requests;
CREATE POLICY "Staff can update demo requests" ON public.demo_requests
  FOR UPDATE TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());
