-- Fix 4: add patient_last_name
ALTER TABLE public.appointment_reminders
  ADD COLUMN IF NOT EXISTS patient_last_name text;

-- Fix 1: enable required extensions and schedule the cron job
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Unschedule any previous version of the same job (idempotent)
DO $$
BEGIN
  PERFORM cron.unschedule('send-appointment-reminders-daily');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'send-appointment-reminders-daily',
  '0 5 * * *',
  $cron$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/send-appointment-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY')
    ),
    body := '{}'::jsonb
  );
  $cron$
);