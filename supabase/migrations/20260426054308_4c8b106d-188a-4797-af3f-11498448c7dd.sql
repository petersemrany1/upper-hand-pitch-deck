-- Sales Call Portal: additive schema changes only

-- 1. sales_reps table
CREATE TABLE IF NOT EXISTS public.sales_reps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_reps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read sales_reps" ON public.sales_reps FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert sales_reps" ON public.sales_reps FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update sales_reps" ON public.sales_reps FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete sales_reps" ON public.sales_reps FOR DELETE TO authenticated USING (true);

-- Seed Peter Semrany (idempotent)
INSERT INTO public.sales_reps (name, email)
VALUES ('Peter Semrany', NULL)
ON CONFLICT (email) DO NOTHING;

-- 2. meta_leads additive columns
ALTER TABLE public.meta_leads
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS call_notes TEXT,
  ADD COLUMN IF NOT EXISTS finance_eligible BOOLEAN,
  ADD COLUMN IF NOT EXISTS callback_scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS booking_date DATE,
  ADD COLUMN IF NOT EXISTS booking_time TEXT,
  ADD COLUMN IF NOT EXISTS rep_id UUID,
  ADD COLUMN IF NOT EXISTS clinic_id UUID,
  ADD COLUMN IF NOT EXISTS day_number INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS finance_form_answers JSONB;

CREATE INDEX IF NOT EXISTS idx_meta_leads_status ON public.meta_leads(status);
CREATE INDEX IF NOT EXISTS idx_meta_leads_callback_scheduled_at ON public.meta_leads(callback_scheduled_at);

-- 3. call_records additive columns
ALTER TABLE public.call_records
  ADD COLUMN IF NOT EXISTS lead_id UUID,
  ADD COLUMN IF NOT EXISTS rep_id UUID,
  ADD COLUMN IF NOT EXISTS attempt_number INT,
  ADD COLUMN IF NOT EXISTS day_number INT,
  ADD COLUMN IF NOT EXISTS time_slot TEXT,
  ADD COLUMN IF NOT EXISTS dial_number INT,
  ADD COLUMN IF NOT EXISTS outcome TEXT,
  ADD COLUMN IF NOT EXISTS duration_seconds INT;

CREATE INDEX IF NOT EXISTS idx_call_records_lead_id ON public.call_records(lead_id);
CREATE INDEX IF NOT EXISTS idx_call_records_rep_id ON public.call_records(rep_id);

-- 4. clinics additive: doctor_name + suburb (for distance matcher)
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS doctor_name TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT;

-- Seed Nitai if not present (only sets new fields, won't disturb existing record)
DO $$
DECLARE
  v_id UUID;
BEGIN
  SELECT id INTO v_id FROM public.clinics WHERE clinic_name ILIKE 'Nitai%' LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO public.clinics (clinic_name, state, city, doctor_name, address)
    VALUES ('Nitai Medical & Cosmetic Centre', 'VIC', 'Essendon', 'Dr. Shabna Singh', '64 Lincoln Rd Essendon VIC 3040');
  ELSE
    UPDATE public.clinics
    SET doctor_name = COALESCE(doctor_name, 'Dr. Shabna Singh'),
        address = COALESCE(address, '64 Lincoln Rd Essendon VIC 3040')
    WHERE id = v_id;
  END IF;
END $$;

-- 5. Storage bucket for MMS images
INSERT INTO storage.buckets (id, name, public)
VALUES ('mms-images', 'mms-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read policy for mms-images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read mms-images'
  ) THEN
    CREATE POLICY "Public read mms-images" ON storage.objects FOR SELECT USING (bucket_id = 'mms-images');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated upload mms-images'
  ) THEN
    CREATE POLICY "Authenticated upload mms-images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'mms-images');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated update mms-images'
  ) THEN
    CREATE POLICY "Authenticated update mms-images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'mms-images');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated delete mms-images'
  ) THEN
    CREATE POLICY "Authenticated delete mms-images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'mms-images');
  END IF;
END $$;

-- 6. pg_cron daily auto-drop: any meta_lead created >14 days ago + status not in (booked, dropped) -> dropped
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  PERFORM cron.unschedule('meta-leads-auto-drop-day15');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'meta-leads-auto-drop-day15',
  '0 3 * * *',
  $$
  UPDATE public.meta_leads
  SET status = 'dropped', updated_at = now()
  WHERE created_at < (now() - interval '14 days')
    AND status NOT IN ('booked', 'dropped');
  $$
);