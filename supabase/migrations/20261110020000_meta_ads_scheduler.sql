CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE OR REPLACE FUNCTION public.meta_ads_tick()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE endpoint text; service_key text;
BEGIN
  SELECT decrypted_secret INTO endpoint FROM vault.decrypted_secrets WHERE name='SUPABASE_URL' LIMIT 1;
  SELECT decrypted_secret INTO service_key FROM vault.decrypted_secrets WHERE name='SUPABASE_SERVICE_ROLE_KEY' LIMIT 1;
  IF endpoint IS NULL OR service_key IS NULL THEN RETURN; END IF;
  PERFORM net.http_post(url:=endpoint||'/functions/v1/process-meta-ads',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||service_key),body:='{}'::jsonb,timeout_milliseconds:=55000);
END $$;
REVOKE ALL ON FUNCTION public.meta_ads_tick() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.meta_ads_tick() TO service_role;
DO $$ BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname='process-meta-ads';
  PERFORM cron.schedule('process-meta-ads','* * * * *','SELECT public.meta_ads_tick()');
END $$;
