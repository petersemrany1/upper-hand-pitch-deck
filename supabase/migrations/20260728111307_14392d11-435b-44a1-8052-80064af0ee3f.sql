-- 1. Add kiosk_pin to clinicflow_clinic_settings
ALTER TABLE public.clinicflow_clinic_settings
  ADD COLUMN IF NOT EXISTS kiosk_pin text NOT NULL DEFAULT '0000';

-- 2. Create clinicflow_intakes table
CREATE TABLE IF NOT EXISTS public.clinicflow_intakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.partner_clinics(id) ON DELETE CASCADE,
  appointment_id uuid NOT NULL UNIQUE REFERENCES public.clinic_appointments(id) ON DELETE CASCADE,
  lead_id uuid,
  status text NOT NULL DEFAULT 'in_progress',
  completed_at timestamptz,

  confirmed_name text,
  dob date,
  mobile text,
  email text,
  emergency_contact_name text,
  emergency_contact_phone text,
  gp_details text,
  medications text,
  allergies text,
  medical_conditions text,
  previous_treatments text,

  hair_answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  wellbeing_answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  wellbeing_review boolean NOT NULL DEFAULT false,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS clinicflow_intakes_clinic_id_idx ON public.clinicflow_intakes(clinic_id);
CREATE INDEX IF NOT EXISTS clinicflow_intakes_appointment_id_idx ON public.clinicflow_intakes(appointment_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinicflow_intakes TO authenticated;
GRANT ALL ON public.clinicflow_intakes TO service_role;

ALTER TABLE public.clinicflow_intakes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all intakes"
  ON public.clinicflow_intakes
  FOR ALL
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

CREATE POLICY "Clinic users manage their clinic intakes"
  ON public.clinicflow_intakes
  FOR ALL
  TO authenticated
  USING (public.is_clinic_user_for(clinic_id))
  WITH CHECK (public.is_clinic_user_for(clinic_id));

CREATE TRIGGER clinicflow_intakes_updated_at
  BEFORE UPDATE ON public.clinicflow_intakes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();