-- Legal move, switch-over step: run in the LEGAL database (Legal Group Portal
-- Lovable chat) ON MOVE DAY, right after the Hair app takes over. Stops the
-- old app's timed jobs so reminders and follow-ups are never sent twice.
-- Nothing is deleted: re-enable with cron.alter_job(jobid, active := true).
SELECT cron.alter_job(jobid, active := false)
FROM cron.job
WHERE jobname IN ('firm-booking-follow-ups', 'qualified-client-call-hooks', 'send-appointment-reminders', 'legal-meta-spend-daily');
