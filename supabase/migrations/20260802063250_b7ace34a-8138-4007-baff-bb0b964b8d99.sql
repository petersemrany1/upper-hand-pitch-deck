create extension if not exists pg_cron;
create extension if not exists pg_net;

create table if not exists public.internal_cron_config (
  key text primary key,
  value text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

revoke all on public.internal_cron_config from anon, authenticated;
grant all on public.internal_cron_config to service_role;
alter table public.internal_cron_config enable row level security;

drop trigger if exists update_internal_cron_config_updated_at on public.internal_cron_config;
create trigger update_internal_cron_config_updated_at
  before update on public.internal_cron_config
  for each row execute function public.update_updated_at_column();

do $$
begin
  if exists (select 1 from cron.job where jobname = 'clinicflow-digest-a') then
    perform cron.unschedule('clinicflow-digest-a');
  end if;
  if exists (select 1 from cron.job where jobname = 'clinicflow-digest-b') then
    perform cron.unschedule('clinicflow-digest-b');
  end if;
end $$;

select cron.schedule('clinicflow-digest-a', '0 22 * * *', $job$
  select net.http_post(
    url := 'https://hairtransplantgroup.lovable.app/api/public/clinicflow-daily-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select value from public.internal_cron_config where key = 'clinicflow_cron_secret')
    ),
    body := '{"source":"cron"}'::jsonb
  );
$job$);

select cron.schedule('clinicflow-digest-b', '0 23 * * *', $job$
  select net.http_post(
    url := 'https://hairtransplantgroup.lovable.app/api/public/clinicflow-daily-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select value from public.internal_cron_config where key = 'clinicflow_cron_secret')
    ),
    body := '{"source":"cron"}'::jsonb
  );
$job$);