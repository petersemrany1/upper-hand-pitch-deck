ALTER TABLE public.clinic_appointments
  ADD COLUMN IF NOT EXISTS disqualified_reason text,
  ADD COLUMN IF NOT EXISTS disqualified_at timestamptz,
  ADD COLUMN IF NOT EXISTS disqualified_by uuid REFERENCES auth.users(id);

COMMENT ON COLUMN public.clinic_appointments.disqualified_reason IS 'Admin-supplied reason when outcome=disqualified. Patient showed but was not a valid candidate; does not count toward clinic pack quota.';
COMMENT ON COLUMN public.clinic_appointments.outcome IS 'One of: show, noshow, proceeded, disqualified, or null.';