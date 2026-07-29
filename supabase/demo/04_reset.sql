-- Snapshot + reset for the Agila demo sandbox (project wdynqlrbirvartitpwcn).
-- NEVER run against production. See supabase/demo/README.md.

create schema if not exists demo_seed;

-- Snapshot the current (pristine) sandbox contents.
do $$
declare t text;
begin
  foreach t in array array[
    'clients','policies','renewals','commissions','deals','leads','quote_requests',
    'cross_sell_opportunities','tasks','activities','claims','documents',
    'email_campaigns','contact_submissions','demo_requests','renewal_log','renewal_email_log',
    'audit_log','cron_job_log','client_profiles','rate_estimate_factors','rate_estimate_zip_tiers'
  ]
  loop
    execute format('drop table if exists demo_seed.%I', t);
    execute format('create table demo_seed.%I as table public.%I', t, t);
  end loop;
end $$;

create or replace function public.demo_reset()
returns text language plpgsql security definer set search_path to 'public'
as $fn$
declare
  t text;
  ordered text[] := array[
    'renewal_log','renewal_email_log','commissions','renewals','claims','documents',
    'activities','tasks','cross_sell_opportunities','deals','quote_request_documents',
    'quote_requests','policies','client_profiles','clients','leads','email_campaigns',
    'contact_submissions','demo_requests','audit_log','cron_job_log',
    'rate_estimate_factors','rate_estimate_zip_tiers'
  ];
begin
  foreach t in array ordered loop
    execute format('delete from public.%I', t);
  end loop;

  foreach t in array array[
    'rate_estimate_zip_tiers','rate_estimate_factors','cron_job_log','audit_log',
    'demo_requests','contact_submissions','email_campaigns','leads','clients',
    'client_profiles','policies','quote_requests','deals','cross_sell_opportunities',
    'tasks','activities','documents','claims','renewals','commissions',
    'renewal_email_log','renewal_log'
  ]
  loop
    if exists (select 1 from information_schema.tables
               where table_schema='demo_seed' and table_name=t) then
      execute format('insert into public.%I select * from demo_seed.%I', t, t);
    end if;
  end loop;

  insert into public.cron_job_log (job_name, rows_affected)
  values ('demo_reset', (select count(*) from public.clients));

  return 'demo sandbox reset at ' || now();
end;
$fn$;

revoke all on function public.demo_reset() from public, anon, authenticated;

-- Hourly reset
create extension if not exists pg_cron;
select cron.unschedule(jobid) from cron.job where jobname = 'demo-hourly-reset';
select cron.schedule('demo-hourly-reset', '0 * * * *', $$select public.demo_reset();$$);
