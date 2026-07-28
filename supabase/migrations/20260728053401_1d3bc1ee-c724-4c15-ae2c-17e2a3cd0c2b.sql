CREATE TABLE public.clinicflow_clinic_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id uuid NOT NULL UNIQUE REFERENCES public.partner_clinics(id) ON DELETE CASCADE,
  stripe_account_id text,
  stripe_details_submitted boolean NOT NULL DEFAULT false,
  stripe_charges_enabled boolean NOT NULL DEFAULT false,
  logo_url text,
  whatsapp_number text,
  default_deposit_amount numeric NOT NULL DEFAULT 1500,
  quote_validity_days integer NOT NULL DEFAULT 30,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.clinicflow_clinic_settings TO authenticated;
GRANT ALL ON public.clinicflow_clinic_settings TO service_role;

ALTER TABLE public.clinicflow_clinic_settings ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY "clinicflow_settings_admin_all"
  ON public.clinicflow_clinic_settings
  FOR ALL
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- Clinic users can view their own clinic's row
CREATE POLICY "clinicflow_settings_clinic_select"
  ON public.clinicflow_clinic_settings
  FOR SELECT
  TO authenticated
  USING (public.is_clinic_user_for(clinic_id));

-- Clinic users can update their own clinic's row.
-- Stripe status fields are locked from clinic edits: the row-check disallows changing them
-- (clinic UPDATEs must leave stripe_account_id / stripe_details_submitted / stripe_charges_enabled unchanged).
-- Service role bypasses RLS and is the only writer for those fields.
CREATE POLICY "clinicflow_settings_clinic_update"
  ON public.clinicflow_clinic_settings
  FOR UPDATE
  TO authenticated
  USING (public.is_clinic_user_for(clinic_id))
  WITH CHECK (
    public.is_clinic_user_for(clinic_id)
  );

-- Clinic users can create their own clinic's row
CREATE POLICY "clinicflow_settings_clinic_insert"
  ON public.clinicflow_clinic_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_clinic_user_for(clinic_id));

-- Prevent clinic users from mutating Stripe status fields via a trigger.
CREATE OR REPLACE FUNCTION public.clinicflow_settings_guard_stripe_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' OR public.is_admin_user() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.stripe_account_id IS DISTINCT FROM OLD.stripe_account_id
       OR NEW.stripe_details_submitted IS DISTINCT FROM OLD.stripe_details_submitted
       OR NEW.stripe_charges_enabled IS DISTINCT FROM OLD.stripe_charges_enabled THEN
      RAISE EXCEPTION 'Stripe status fields are managed by backend only';
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    IF NEW.stripe_account_id IS NOT NULL
       OR NEW.stripe_details_submitted = true
       OR NEW.stripe_charges_enabled = true THEN
      RAISE EXCEPTION 'Stripe status fields are managed by backend only';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER clinicflow_settings_guard_stripe
  BEFORE INSERT OR UPDATE ON public.clinicflow_clinic_settings
  FOR EACH ROW EXECUTE FUNCTION public.clinicflow_settings_guard_stripe_fields();

CREATE TRIGGER update_clinicflow_clinic_settings_updated_at
  BEFORE UPDATE ON public.clinicflow_clinic_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX clinicflow_clinic_settings_clinic_id_idx
  ON public.clinicflow_clinic_settings(clinic_id);