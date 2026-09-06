DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'meta-ad-spend-daily') THEN
    PERFORM cron.unschedule('meta-ad-spend-daily');
  END IF;
END $$;

SELECT cron.schedule(
  'meta-ad-spend-daily',
  '15 16 * * *',
  $$SELECT net.http_post(
    url := 'https://project--1d2b5d82-7b6e-4a9c-9899-a64f78717875.lovable.app/api/public/meta-ad-spend',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY')
    ),
    body := '{}'::jsonb
  );$$
);