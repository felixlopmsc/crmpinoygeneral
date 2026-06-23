/*
  # Auto-expire stale policies

  1. Enable pg_cron extension
  2. Create cron_job_log table for audit trail
  3. One-time backfill: set all overdue Active policies to Expired
  4. Schedule daily job at 2:00 AM UTC to expire newly-stale policies
*/

-- 1. Enable pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- 2. Log table for cron runs
CREATE TABLE IF NOT EXISTS public.cron_job_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job_name text NOT NULL,
  rows_affected integer NOT NULL DEFAULT 0,
  executed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cron_job_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_authenticated_read_cron_log" ON public.cron_job_log
  FOR SELECT TO authenticated USING (true);

-- 3. One-time backfill
UPDATE policies
SET status = 'Expired'
WHERE expiration_date < CURRENT_DATE
  AND status = 'Active';

-- 4. Schedule daily cron job at 2:00 AM UTC
SELECT cron.schedule(
  'expire-stale-policies',
  '0 2 * * *',
  $cron_body$
  DO $inner$
  DECLARE
    affected_count integer;
  BEGIN
    UPDATE policies
    SET status = 'Expired'
    WHERE expiration_date < CURRENT_DATE
      AND status = 'Active';

    GET DIAGNOSTICS affected_count = ROW_COUNT;

    INSERT INTO public.cron_job_log (job_name, rows_affected)
    VALUES ('expire-stale-policies', affected_count);
  END;
  $inner$;
  $cron_body$
);
