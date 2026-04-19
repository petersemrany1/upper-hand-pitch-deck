-- Helper: normalise a phone number to digits only (for matching)
CREATE OR REPLACE FUNCTION public.normalize_phone(p TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT regexp_replace(COALESCE(p, ''), '[^0-9]', '', 'g')
$$;

-- Threads (one per remote phone number)
CREATE TABLE public.sms_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL UNIQUE,
  phone_normalized TEXT GENERATED ALWAYS AS (public.normalize_phone(phone)) STORED,
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE SET NULL,
  display_name TEXT,
  last_message_preview TEXT,
  last_message_at TIMESTAMPTZ,
  last_direction TEXT,
  unread_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sms_threads_phone_norm ON public.sms_threads(phone_normalized);
CREATE INDEX idx_sms_threads_clinic ON public.sms_threads(clinic_id);
CREATE INDEX idx_sms_threads_last_at ON public.sms_threads(last_message_at DESC NULLS LAST);

-- Messages
CREATE TABLE public.sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.sms_threads(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
  body TEXT,
  media_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  twilio_message_sid TEXT UNIQUE,
  status TEXT,
  error_code TEXT,
  from_number TEXT,
  to_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sms_messages_thread ON public.sms_messages(thread_id, created_at);

-- Auto-link thread to clinic on insert/update of phone
CREATE OR REPLACE FUNCTION public.sms_thread_link_clinic()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matched_id UUID;
  matched_name TEXT;
BEGIN
  IF NEW.clinic_id IS NULL THEN
    SELECT id, clinic_name INTO matched_id, matched_name
    FROM public.clinics
    WHERE public.normalize_phone(phone) = public.normalize_phone(NEW.phone)
      AND public.normalize_phone(phone) <> ''
    LIMIT 1;
    IF matched_id IS NOT NULL THEN
      NEW.clinic_id := matched_id;
      IF NEW.display_name IS NULL THEN
        NEW.display_name := matched_name;
      END IF;
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sms_thread_link_clinic
BEFORE INSERT OR UPDATE OF phone, clinic_id ON public.sms_threads
FOR EACH ROW EXECUTE FUNCTION public.sms_thread_link_clinic();

-- Update thread preview when a message lands
CREATE OR REPLACE FUNCTION public.sms_message_update_thread()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.sms_threads
  SET last_message_preview = COALESCE(NULLIF(NEW.body, ''), CASE WHEN jsonb_array_length(NEW.media_urls) > 0 THEN '📷 Media' ELSE '' END),
      last_message_at = NEW.created_at,
      last_direction = NEW.direction,
      unread_count = CASE WHEN NEW.direction = 'inbound' THEN unread_count + 1 ELSE unread_count END,
      updated_at = now()
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sms_message_update_thread
AFTER INSERT ON public.sms_messages
FOR EACH ROW EXECUTE FUNCTION public.sms_message_update_thread();

-- RLS
ALTER TABLE public.sms_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view sms threads" ON public.sms_threads FOR SELECT USING (true);
CREATE POLICY "Anyone can insert sms threads" ON public.sms_threads FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update sms threads" ON public.sms_threads FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete sms threads" ON public.sms_threads FOR DELETE USING (true);

CREATE POLICY "Anyone can view sms messages" ON public.sms_messages FOR SELECT USING (true);
CREATE POLICY "Anyone can insert sms messages" ON public.sms_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update sms messages" ON public.sms_messages FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete sms messages" ON public.sms_messages FOR DELETE USING (true);

-- Realtime
ALTER TABLE public.sms_threads REPLICA IDENTITY FULL;
ALTER TABLE public.sms_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sms_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sms_messages;

-- Storage bucket for MMS media
INSERT INTO storage.buckets (id, name, public) VALUES ('sms-media', 'sms-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can read sms media" ON storage.objects FOR SELECT USING (bucket_id = 'sms-media');
CREATE POLICY "Anyone can upload sms media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'sms-media');
CREATE POLICY "Anyone can update sms media" ON storage.objects FOR UPDATE USING (bucket_id = 'sms-media');
CREATE POLICY "Anyone can delete sms media" ON storage.objects FOR DELETE USING (bucket_id = 'sms-media');