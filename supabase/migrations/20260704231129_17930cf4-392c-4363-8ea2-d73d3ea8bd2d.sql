ALTER TABLE public.clinic_appointments
  DROP CONSTRAINT IF EXISTS clinic_appointments_outcome_check;

ALTER TABLE public.clinic_appointments
  ADD CONSTRAINT clinic_appointments_outcome_check
  CHECK (outcome IS NULL OR outcome = ANY (ARRAY['show'::text, 'noshow'::text, 'proceeded'::text, 'disqualified'::text]));