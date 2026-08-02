ALTER TABLE public.clinicflow_clinic_settings
  ADD COLUMN IF NOT EXISTS notification_email text,
  ADD COLUMN IF NOT EXISTS email_notifications_enabled boolean NOT NULL DEFAULT false;

CREATE POLICY "cf_followups_clinic_insert" ON public.clinicflow_followups
  FOR INSERT TO authenticated
  WITH CHECK (public.is_clinic_user_for(clinic_id));

CREATE TABLE public.clinicflow_chase_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.partner_clinics(id) ON DELETE CASCADE,
  appointment_id uuid NOT NULL REFERENCES public.clinic_appointments(id) ON DELETE CASCADE,
  quote_id uuid REFERENCES public.clinicflow_quotes(id) ON DELETE SET NULL,
  patient_name text NOT NULL,
  note text,
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','done')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  done_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX clinicflow_chase_clinic_idx ON public.clinicflow_chase_requests (clinic_id, status);
GRANT SELECT, INSERT, UPDATE ON public.clinicflow_chase_requests TO authenticated;
GRANT ALL ON public.clinicflow_chase_requests TO service_role;
ALTER TABLE public.clinicflow_chase_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cf_chase_admin_all" ON public.clinicflow_chase_requests
  FOR ALL TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
CREATE POLICY "cf_chase_clinic_select" ON public.clinicflow_chase_requests
  FOR SELECT TO authenticated USING (public.is_clinic_user_for(clinic_id));
CREATE POLICY "cf_chase_clinic_insert" ON public.clinicflow_chase_requests
  FOR INSERT TO authenticated WITH CHECK (public.is_clinic_user_for(clinic_id));