
-- Tables first
CREATE TABLE public.clinic_portal_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id uuid NOT NULL REFERENCES public.partner_clinics(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.clinic_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.partner_clinics(id) ON DELETE CASCADE,
  lead_id uuid,
  patient_name text NOT NULL,
  patient_phone text,
  appointment_date date NOT NULL,
  appointment_time text NOT NULL,
  intel_notes text,
  outcome text CHECK (outcome IN ('show','noshow','proceeded')),
  consult_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX clinic_appointments_clinic_idx ON public.clinic_appointments(clinic_id, appointment_date);
CREATE INDEX clinic_appointments_lead_idx ON public.clinic_appointments(lead_id);

CREATE TABLE public.clinic_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.partner_clinics(id) ON DELETE CASCADE,
  override_date date NOT NULL,
  override_type text NOT NULL CHECK (override_type IN ('blocked','open')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, override_date)
);

-- Helper functions
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.sales_reps WHERE id = auth.uid() AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.is_clinic_user_for(_clinic_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.clinic_portal_users WHERE id = auth.uid() AND clinic_id = _clinic_id);
$$;

CREATE OR REPLACE FUNCTION public.current_clinic_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT clinic_id FROM public.clinic_portal_users WHERE id = auth.uid() LIMIT 1;
$$;

-- RLS
ALTER TABLE public.clinic_portal_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage clinic_portal_users" ON public.clinic_portal_users
  FOR ALL TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
CREATE POLICY "clinic reads own portal user" ON public.clinic_portal_users
  FOR SELECT TO authenticated USING (id = auth.uid());

ALTER TABLE public.clinic_appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin full clinic_appointments" ON public.clinic_appointments
  FOR ALL TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
CREATE POLICY "clinic select own appts" ON public.clinic_appointments
  FOR SELECT TO authenticated USING (public.is_clinic_user_for(clinic_id));
CREATE POLICY "clinic update own appts" ON public.clinic_appointments
  FOR UPDATE TO authenticated USING (public.is_clinic_user_for(clinic_id)) WITH CHECK (public.is_clinic_user_for(clinic_id));
CREATE POLICY "rep read clinic_appointments" ON public.clinic_appointments
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.sales_reps WHERE id = auth.uid()));
CREATE POLICY "rep insert clinic_appointments" ON public.clinic_appointments
  FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.sales_reps WHERE id = auth.uid()));
CREATE POLICY "rep update clinic_appointments" ON public.clinic_appointments
  FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.sales_reps WHERE id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.sales_reps WHERE id = auth.uid()));

CREATE TRIGGER clinic_appointments_updated_at BEFORE UPDATE ON public.clinic_appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.clinic_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin full clinic_availability" ON public.clinic_availability
  FOR ALL TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
CREATE POLICY "clinic manage own availability" ON public.clinic_availability
  FOR ALL TO authenticated USING (public.is_clinic_user_for(clinic_id)) WITH CHECK (public.is_clinic_user_for(clinic_id));
CREATE POLICY "rep read clinic_availability" ON public.clinic_availability
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.sales_reps WHERE id = auth.uid()));
