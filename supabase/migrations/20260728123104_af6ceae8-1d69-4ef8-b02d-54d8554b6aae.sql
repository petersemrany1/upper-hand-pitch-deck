
-- 1. follicle model URL on settings
ALTER TABLE public.clinicflow_clinic_settings
  ADD COLUMN IF NOT EXISTS follicle_model_url text;

-- 2. Follow-ups table
CREATE TABLE IF NOT EXISTS public.clinicflow_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.partner_clinics(id) ON DELETE CASCADE,
  quote_id uuid NOT NULL REFERENCES public.clinicflow_quotes(id) ON DELETE CASCADE,
  patient_name text NOT NULL,
  due_date date NOT NULL,
  task_type text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  done_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS clinicflow_followups_clinic_due_idx ON public.clinicflow_followups (clinic_id, status, due_date);
CREATE INDEX IF NOT EXISTS clinicflow_followups_quote_idx ON public.clinicflow_followups (quote_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinicflow_followups TO authenticated;
GRANT ALL ON public.clinicflow_followups TO service_role;
ALTER TABLE public.clinicflow_followups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cf_followups_admin_all" ON public.clinicflow_followups
  FOR ALL TO authenticated
  USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
CREATE POLICY "cf_followups_clinic_read" ON public.clinicflow_followups
  FOR SELECT TO authenticated
  USING (public.is_clinic_user_for(clinic_id));
CREATE POLICY "cf_followups_clinic_update" ON public.clinicflow_followups
  FOR UPDATE TO authenticated
  USING (public.is_clinic_user_for(clinic_id)) WITH CHECK (public.is_clinic_user_for(clinic_id));

-- 3. Photos table
CREATE TABLE IF NOT EXISTS public.clinicflow_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.partner_clinics(id) ON DELETE CASCADE,
  stage text NOT NULL CHECK (stage IN ('day_1','week_1_2','weeks_2_4','month_3','month_6','month_12')),
  url text NOT NULL,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS clinicflow_photos_clinic_stage_idx ON public.clinicflow_photos (clinic_id, stage, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinicflow_photos TO authenticated;
GRANT ALL ON public.clinicflow_photos TO service_role;
ALTER TABLE public.clinicflow_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cf_photos_admin_all" ON public.clinicflow_photos
  FOR ALL TO authenticated
  USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
CREATE POLICY "cf_photos_clinic_all" ON public.clinicflow_photos
  FOR ALL TO authenticated
  USING (public.is_clinic_user_for(clinic_id)) WITH CHECK (public.is_clinic_user_for(clinic_id));

-- 4. Trigger: auto-create 3 follow-ups when a quote is created (status presented)
CREATE OR REPLACE FUNCTION public.clinicflow_create_followups_for_quote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'presented' THEN
    INSERT INTO public.clinicflow_followups (clinic_id, quote_id, patient_name, due_date, task_type)
    VALUES
      (NEW.clinic_id, NEW.id, NEW.patient_name, (CURRENT_DATE + INTERVAL '2 days')::date, 'checkin'),
      (NEW.clinic_id, NEW.id, NEW.patient_name, (CURRENT_DATE + INTERVAL '7 days')::date, 'nudge'),
      (NEW.clinic_id, NEW.id, NEW.patient_name, (NEW.valid_until - INTERVAL '3 days')::date, 'expiring');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clinicflow_quotes_create_followups ON public.clinicflow_quotes;
CREATE TRIGGER clinicflow_quotes_create_followups
AFTER INSERT ON public.clinicflow_quotes
FOR EACH ROW EXECUTE FUNCTION public.clinicflow_create_followups_for_quote();

-- 5. Trigger: auto-close open follow-ups when quote becomes booked/deposit_recorded
CREATE OR REPLACE FUNCTION public.clinicflow_close_followups_on_book()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('booked','deposit_recorded')
     AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    UPDATE public.clinicflow_followups
      SET status = 'done', done_at = now()
      WHERE quote_id = NEW.id AND status = 'open';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clinicflow_quotes_close_followups ON public.clinicflow_quotes;
CREATE TRIGGER clinicflow_quotes_close_followups
AFTER UPDATE ON public.clinicflow_quotes
FOR EACH ROW EXECUTE FUNCTION public.clinicflow_close_followups_on_book();
