CREATE TABLE public.clinicflow_pipeline_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.partner_clinics(id) ON DELETE CASCADE,
  appointment_id uuid NOT NULL UNIQUE REFERENCES public.clinic_appointments(id) ON DELETE CASCADE,
  lost_reason text CHECK (lost_reason IN ('no_show','no_money','decision_maker_absent','went_elsewhere','not_suitable','other')),
  lost_note text,
  lost_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX clinicflow_pipeline_status_clinic_idx ON public.clinicflow_pipeline_status (clinic_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinicflow_pipeline_status TO authenticated;
GRANT ALL ON public.clinicflow_pipeline_status TO service_role;
ALTER TABLE public.clinicflow_pipeline_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cf_pipeline_admin_all" ON public.clinicflow_pipeline_status
  FOR ALL TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
CREATE POLICY "cf_pipeline_clinic_all" ON public.clinicflow_pipeline_status
  FOR ALL TO authenticated USING (public.is_clinic_user_for(clinic_id)) WITH CHECK (public.is_clinic_user_for(clinic_id));

CREATE TRIGGER clinicflow_pipeline_status_updated_at
  BEFORE UPDATE ON public.clinicflow_pipeline_status
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();