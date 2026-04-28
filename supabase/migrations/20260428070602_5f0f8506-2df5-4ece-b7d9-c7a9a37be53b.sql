ALTER TABLE public.sms_messages ADD COLUMN IF NOT EXISTS lead_id uuid;
ALTER TABLE public.sms_messages ADD COLUMN IF NOT EXISTS sent_at timestamp with time zone;
ALTER TABLE public.sms_messages ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.sms_messages ALTER COLUMN thread_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sms_messages_lead_id ON public.sms_messages(lead_id);