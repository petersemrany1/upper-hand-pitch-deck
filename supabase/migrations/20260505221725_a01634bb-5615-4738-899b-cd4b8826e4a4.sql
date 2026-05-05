SELECT cron.unschedule('send-appointment-reminders-daily');
SELECT cron.schedule(
  'send-appointment-reminders-daily',
  '0 5 * * *',
  $$SELECT net.http_post(
    url := 'https://sfwokpeeffgrkxaptqji.supabase.co/functions/v1/send-appointment-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  );$$
);