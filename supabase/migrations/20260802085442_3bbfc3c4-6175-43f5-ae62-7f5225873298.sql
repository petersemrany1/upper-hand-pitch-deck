ALTER TABLE public.partner_clinics
  ADD COLUMN IF NOT EXISTS clinicflow_enabled boolean NOT NULL DEFAULT false;

UPDATE public.partner_clinics
  SET clinicflow_enabled = true
  WHERE clinic_name = 'ClinicFlow Test Clinic';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'partner_clinics'
      AND policyname = 'Clinic users read their own clinic'
  ) THEN
    CREATE POLICY "Clinic users read their own clinic"
      ON public.partner_clinics
      FOR SELECT
      TO authenticated
      USING (public.is_clinic_user_for(id));
  END IF;
END $$;

GRANT SELECT ON public.partner_clinics TO authenticated;