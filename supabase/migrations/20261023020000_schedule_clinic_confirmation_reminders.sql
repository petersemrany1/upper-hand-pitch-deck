-- Apply after deploying the updated reminder and inbound SMS Edge Functions.
-- Reuses the existing production cron credential without exposing or rotating it.
-- No fixed UTC send hour: each booking is evaluated in its clinic's timezone.
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM cron.job WHERE jobname='send-appointment-reminders-daily') THEN
    PERFORM cron.unschedule('send-appointment-reminders-daily');
  END IF;
  IF EXISTS(SELECT 1 FROM cron.job WHERE jobname='send-appointment-reminders-local') THEN
    PERFORM cron.unschedule('send-appointment-reminders-local');
  END IF;
END $$;
SELECT cron.schedule('send-appointment-reminders-local','*/5 * * * *',
  $job$SELECT net.http_post(
    url := 'https://sfwokpeeffgrkxaptqji.supabase.co/functions/v1/send-appointment-reminders',
    headers := jsonb_build_object('Content-Type','application/json','x-internal-secret',(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='internal_function_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );$job$
);
