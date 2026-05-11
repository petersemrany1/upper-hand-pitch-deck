DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'meta-leads-auto-drop-day15') THEN
    PERFORM cron.unschedule('meta-leads-auto-drop-day15');
  END IF;
END $$;