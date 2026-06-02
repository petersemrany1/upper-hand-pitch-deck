
CREATE TABLE public.clinic_appointment_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.clinic_appointments(id) ON DELETE CASCADE,
  clinic_id uuid NOT NULL REFERENCES public.partner_clinics(id) ON DELETE CASCADE,
  author_type text NOT NULL CHECK (author_type IN ('admin','clinic')),
  author_name text,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_clinic_appt_notes_appt ON public.clinic_appointment_notes(appointment_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_appointment_notes TO authenticated;
GRANT ALL ON public.clinic_appointment_notes TO service_role;

ALTER TABLE public.clinic_appointment_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all appt notes"
ON public.clinic_appointment_notes
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

CREATE POLICY "Clinic users read own notes"
ON public.clinic_appointment_notes
FOR SELECT
TO authenticated
USING (public.is_clinic_user_for(clinic_id));

CREATE POLICY "Clinic users add own notes"
ON public.clinic_appointment_notes
FOR INSERT
TO authenticated
WITH CHECK (public.is_clinic_user_for(clinic_id) AND author_type = 'clinic');
