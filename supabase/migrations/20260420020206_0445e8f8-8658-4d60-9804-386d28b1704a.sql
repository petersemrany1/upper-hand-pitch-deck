-- Add phone column for the dialled number
ALTER TABLE public.call_records
  ADD COLUMN IF NOT EXISTS phone text;

-- De-duplicate any existing rows with the same twilio_call_sid before
-- adding the unique constraint (keeps the oldest row).
DELETE FROM public.call_records a
USING public.call_records b
WHERE a.twilio_call_sid IS NOT NULL
  AND a.twilio_call_sid = b.twilio_call_sid
  AND a.created_at > b.created_at;

-- Unique constraint enables ON CONFLICT (twilio_call_sid) upserts.
CREATE UNIQUE INDEX IF NOT EXISTS call_records_twilio_call_sid_uniq
  ON public.call_records (twilio_call_sid)
  WHERE twilio_call_sid IS NOT NULL;