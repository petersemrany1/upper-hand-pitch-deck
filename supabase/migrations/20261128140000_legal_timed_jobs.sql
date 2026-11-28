-- Legal move switch-over: Legal timed jobs on boldfamilylaw.com.au, signed with the portal internal secret.
-- 3. Timed jobs (the Legal app's legal-meta-spend-daily job was switched off, so it isn't recreated).
SELECT cron.schedule('legal-firm-booking-follow-ups', '* * * * *', $job$
  SELECT net.http_post(
    url := 'https://boldfamilylaw.com.au/api/public/hooks/send-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-internal-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'internal_function_secret'),
      'x-booking-follow-ups-only', 'true'),
    body := '{}'::jsonb);
$job$);
SELECT cron.schedule('legal-qualified-client-call-hooks', '* * * * *', $job$
  SELECT net.http_post(
    url := 'https://boldfamilylaw.com.au/api/public/hooks/process-call-hooks',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-internal-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'internal_function_secret')),
    body := '{}'::jsonb, timeout_milliseconds := 120000);
$job$);
SELECT cron.schedule('legal-send-appointment-reminders', '*/15 * * * *', $job$
  SELECT net.http_post(
    url := 'https://boldfamilylaw.com.au/api/public/hooks/send-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-internal-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'internal_function_secret')),
    body := '{}'::jsonb);
$job$);
