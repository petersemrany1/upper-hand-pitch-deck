ALTER TABLE public.clinicflow_clinic_settings
  ADD COLUMN IF NOT EXISTS doctor_name text,
  ADD COLUMN IF NOT EXISTS cooling_off_days integer NOT NULL DEFAULT 7;