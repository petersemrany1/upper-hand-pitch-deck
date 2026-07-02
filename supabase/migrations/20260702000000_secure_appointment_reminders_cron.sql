-- Security: the send-appointment-reminders edge function now requires a trusted
-- caller (it sends SMS on the company Twilio account). Re-schedule the daily
-- pg_cron job so it authenticates with the service-role key, which the function's
-- requireInternalOrSalesRole guard accepts. Previously the cron sent no
-- Authorization header, so the (verify_jwt=false) function was open to anyone.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-appointment-reminders-daily') THEN
    PERFORM cron.unschedule('send-appointment-reminders-daily');
  END IF;
END $$;

SELECT cron.schedule(
  'send-appointment-reminders-daily',
  '0 5 * * *',
  $$SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/send-appointment-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY')
    ),
    body := '{}'::jsonb
  );$$
);
