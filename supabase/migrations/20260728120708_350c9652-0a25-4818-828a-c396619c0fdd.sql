CREATE TABLE public.clinicflow_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.partner_clinics(id) ON DELETE CASCADE,
  appointment_id uuid NOT NULL REFERENCES public.clinic_appointments(id) ON DELETE CASCADE,
  intake_id uuid REFERENCES public.clinicflow_intakes(id) ON DELETE SET NULL,
  lead_id uuid,
  patient_name text NOT NULL,
  diagnosis text NOT NULL,
  norwood text,
  grafts integer,
  price numeric NOT NULL,
  deposit_amount numeric NOT NULL,
  includes_text text,
  valid_until date NOT NULL,
  date_option_1 date,
  date_option_2 date,
  status text NOT NULL DEFAULT 'draft',
  booked_date date,
  deposit_method text,
  deposit_recorded_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT clinicflow_quotes_status_check CHECK (status IN ('draft','presented','booked','deposit_recorded','expired'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinicflow_quotes TO authenticated;
GRANT ALL ON public.clinicflow_quotes TO service_role;

ALTER TABLE public.clinicflow_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinicflow_quotes_admin_all" ON public.clinicflow_quotes
  FOR ALL TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

CREATE POLICY "clinicflow_quotes_clinic_all" ON public.clinicflow_quotes
  FOR ALL TO authenticated
  USING (public.is_clinic_user_for(clinic_id))
  WITH CHECK (public.is_clinic_user_for(clinic_id));

CREATE INDEX clinicflow_quotes_appt_idx ON public.clinicflow_quotes (appointment_id, created_at DESC);
CREATE INDEX clinicflow_quotes_clinic_idx ON public.clinicflow_quotes (clinic_id, created_at DESC);

CREATE TRIGGER trg_clinicflow_quotes_updated_at
  BEFORE UPDATE ON public.clinicflow_quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();