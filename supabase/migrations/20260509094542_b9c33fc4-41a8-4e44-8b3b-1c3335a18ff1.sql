ALTER TABLE public.clinic_availability
  ADD COLUMN IF NOT EXISTS start_time time,
  ADD COLUMN IF NOT EXISTS end_time time;

CREATE INDEX IF NOT EXISTS idx_clinic_availability_clinic_date
  ON public.clinic_availability(clinic_id, override_date);