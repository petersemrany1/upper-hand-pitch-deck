ALTER TABLE public.clinic_appointments
  ADD COLUMN IF NOT EXISTS doctor_id uuid REFERENCES public.partner_doctors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS doctor_name text;

CREATE INDEX IF NOT EXISTS clinic_appointments_doctor_id_idx
  ON public.clinic_appointments (doctor_id);