
CREATE TABLE public.clinic_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  first_name text,
  last_name text,
  email text,
  phone text,
  clinic_name text,
  city text,
  state text,
  source text NOT NULL DEFAULT 'partner',
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'new',
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_leads TO authenticated;
GRANT ALL ON public.clinic_leads TO service_role;

ALTER TABLE public.clinic_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read clinic leads"
  ON public.clinic_leads FOR SELECT
  TO authenticated
  USING (public.is_admin_user());

CREATE POLICY "Admins can insert clinic leads"
  ON public.clinic_leads FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_user());

CREATE POLICY "Admins can update clinic leads"
  ON public.clinic_leads FOR UPDATE
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

CREATE POLICY "Admins can delete clinic leads"
  ON public.clinic_leads FOR DELETE
  TO authenticated
  USING (public.is_admin_user());

CREATE INDEX clinic_leads_created_at_idx ON public.clinic_leads (created_at DESC);
CREATE INDEX clinic_leads_email_idx ON public.clinic_leads (lower(email));
CREATE INDEX clinic_leads_phone_idx ON public.clinic_leads (right(regexp_replace(coalesce(phone,''), '[^0-9]', '', 'g'), 9));

CREATE TRIGGER update_clinic_leads_updated_at
  BEFORE UPDATE ON public.clinic_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
