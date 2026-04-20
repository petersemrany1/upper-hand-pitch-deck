-- Replace the partial unique index with a full UNIQUE constraint so
-- ON CONFLICT (twilio_call_sid) upserts work from both the browser
-- and the twilio-status webhook.
DROP INDEX IF EXISTS public.call_records_twilio_call_sid_uniq;

ALTER TABLE public.call_records
  ADD CONSTRAINT call_records_twilio_call_sid_key UNIQUE (twilio_call_sid);