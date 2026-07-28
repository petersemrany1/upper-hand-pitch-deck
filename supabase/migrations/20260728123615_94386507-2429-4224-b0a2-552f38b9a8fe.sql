
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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinicflow_followups TO authenticated;
GRANT ALL ON public.clinicflow_followups TO service_role;
ALTER TABLE public.clinicflow_followups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cf_followups_admin_all" ON public.clinicflow_followups;
DROP POLICY IF EXISTS "cf_followups_clinic_select" ON public.clinicflow_followups;
DROP POLICY IF EXISTS "cf_followups_clinic_update" ON public.clinicflow_followups;
CREATE POLICY "cf_followups_admin_all" ON public.clinicflow_followups
  FOR ALL TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
CREATE POLICY "cf_followups_clinic_select" ON public.clinicflow_followups
  FOR SELECT TO authenticated USING (public.is_clinic_user_for(clinic_id));
CREATE POLICY "cf_followups_clinic_update" ON public.clinicflow_followups
  FOR UPDATE TO authenticated USING (public.is_clinic_user_for(clinic_id)) WITH CHECK (public.is_clinic_user_for(clinic_id));

CREATE INDEX IF NOT EXISTS cf_followups_clinic_due_idx ON public.clinicflow_followups (clinic_id, due_date);
CREATE INDEX IF NOT EXISTS cf_followups_quote_idx ON public.clinicflow_followups (quote_id);

CREATE OR REPLACE FUNCTION public.clinicflow_spawn_followups()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'presented'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'presented') THEN
    IF NOT EXISTS (SELECT 1 FROM public.clinicflow_followups WHERE quote_id = NEW.id) THEN
      INSERT INTO public.clinicflow_followups (clinic_id, quote_id, patient_name, due_date, task_type)
      VALUES
        (NEW.clinic_id, NEW.id, NEW.patient_name, (CURRENT_DATE + INTERVAL '2 days')::date, 'checkin'),
        (NEW.clinic_id, NEW.id, NEW.patient_name, (CURRENT_DATE + INTERVAL '7 days')::date, 'nudge'),
        (NEW.clinic_id, NEW.id, NEW.patient_name, (NEW.valid_until - INTERVAL '3 days')::date, 'expiring');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.clinicflow_close_followups()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('booked','deposit_recorded')
     AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE public.clinicflow_followups SET status='done', done_at=now()
     WHERE quote_id = NEW.id AND status='open';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clinicflow_quotes_create_followups ON public.clinicflow_quotes;
CREATE TRIGGER clinicflow_quotes_create_followups
  AFTER INSERT OR UPDATE OF status ON public.clinicflow_quotes
  FOR EACH ROW EXECUTE FUNCTION public.clinicflow_spawn_followups();

DROP TRIGGER IF EXISTS clinicflow_quotes_close_followups ON public.clinicflow_quotes;
CREATE TRIGGER clinicflow_quotes_close_followups
  AFTER UPDATE OF status ON public.clinicflow_quotes
  FOR EACH ROW EXECUTE FUNCTION public.clinicflow_close_followups();

CREATE TABLE IF NOT EXISTS public.clinicflow_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.partner_clinics(id) ON DELETE CASCADE,
  stage text NOT NULL CHECK (stage IN ('day_1','week_1_2','weeks_2_4','month_3','month_6','month_12')),
  url text NOT NULL,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinicflow_photos TO authenticated;
GRANT ALL ON public.clinicflow_photos TO service_role;
ALTER TABLE public.clinicflow_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cf_photos_admin_all" ON public.clinicflow_photos;
DROP POLICY IF EXISTS "cf_photos_clinic_select" ON public.clinicflow_photos;
DROP POLICY IF EXISTS "cf_photos_clinic_insert" ON public.clinicflow_photos;
DROP POLICY IF EXISTS "cf_photos_clinic_delete" ON public.clinicflow_photos;
CREATE POLICY "cf_photos_admin_all" ON public.clinicflow_photos
  FOR ALL TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
CREATE POLICY "cf_photos_clinic_select" ON public.clinicflow_photos
  FOR SELECT TO authenticated USING (public.is_clinic_user_for(clinic_id));
CREATE POLICY "cf_photos_clinic_insert" ON public.clinicflow_photos
  FOR INSERT TO authenticated WITH CHECK (public.is_clinic_user_for(clinic_id));
CREATE POLICY "cf_photos_clinic_delete" ON public.clinicflow_photos
  FOR DELETE TO authenticated USING (public.is_clinic_user_for(clinic_id));
CREATE INDEX IF NOT EXISTS cf_photos_clinic_stage_idx ON public.clinicflow_photos (clinic_id, stage);

DROP POLICY IF EXISTS "cf_photos_read" ON storage.objects;
CREATE POLICY "cf_photos_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id='clinicflow-photos' AND (public.is_admin_user() OR public.is_clinic_user_for(((storage.foldername(name))[1])::uuid)));

DROP POLICY IF EXISTS "cf_photos_insert" ON storage.objects;
CREATE POLICY "cf_photos_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id='clinicflow-photos' AND (public.is_admin_user() OR public.is_clinic_user_for(((storage.foldername(name))[1])::uuid)));

DROP POLICY IF EXISTS "cf_photos_delete" ON storage.objects;
CREATE POLICY "cf_photos_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id='clinicflow-photos' AND (public.is_admin_user() OR public.is_clinic_user_for(((storage.foldername(name))[1])::uuid)));
