-- This portal's scheduler needs permission to wake only the Meta worker.
-- Generate the key inside Vault, never return it to a client or include it in logs.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name='META_ADS_WORKER_TOKEN') THEN
    PERFORM vault.create_secret(gen_random_uuid()::text || gen_random_uuid()::text, 'META_ADS_WORKER_TOKEN', 'Wake only the Meta Ads publishing worker');
  END IF;
END $$;
CREATE OR REPLACE FUNCTION public.meta_ads_worker_authenticate(p_token text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT EXISTS(SELECT 1 FROM vault.decrypted_secrets WHERE name='META_ADS_WORKER_TOKEN' AND decrypted_secret=p_token);
$$;
REVOKE ALL ON FUNCTION public.meta_ads_worker_authenticate(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.meta_ads_worker_authenticate(text) TO service_role;
CREATE OR REPLACE FUNCTION public.meta_ads_tick()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE worker_token text;
BEGIN
  SELECT decrypted_secret INTO STRICT worker_token FROM vault.decrypted_secrets WHERE name='META_ADS_WORKER_TOKEN';
  -- Fixed portal project: do not send this key to a caller-supplied URL.
  PERFORM net.http_post(url:='https://sfwokpeeffgrkxaptqji.supabase.co/functions/v1/process-meta-ads',headers:=jsonb_build_object('Content-Type','application/json','X-Meta-Worker-Token',worker_token),body:='{}'::jsonb,timeout_milliseconds:=55000);
END $$;
REVOKE ALL ON FUNCTION public.meta_ads_tick() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.meta_ads_tick() TO service_role;
