ALTER TABLE public.clinic_appointments
  ADD COLUMN IF NOT EXISTS chase_status text,
  ADD COLUMN IF NOT EXISTS chase_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS chase_note text,
  ADD COLUMN IF NOT EXISTS chase_requested_by uuid,
  ADD COLUMN IF NOT EXISTS chase_result_at timestamptz,
  ADD COLUMN IF NOT EXISTS chase_result_by uuid;

ALTER TABLE public.clinic_appointments
  DROP CONSTRAINT IF EXISTS clinic_appointments_chase_status_check;
ALTER TABLE public.clinic_appointments
  ADD CONSTRAINT clinic_appointments_chase_status_check
  CHECK (chase_status IS NULL OR chase_status IN ('requested','rebooked','not_proceeding','no_answer','voicemail'));

CREATE INDEX IF NOT EXISTS idx_clinic_appointments_chase_requested
  ON public.clinic_appointments (chase_requested_at)
  WHERE chase_status = 'requested';