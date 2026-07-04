CREATE OR REPLACE FUNCTION public.enforce_admin_only_disqualification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' OR public.is_admin_user() THEN
    RETURN NEW;
  END IF;

  IF NEW.outcome = 'disqualified'
     OR NEW.disqualified_reason IS NOT NULL
     OR NEW.disqualified_at IS NOT NULL
     OR NEW.disqualified_by IS NOT NULL THEN
    RAISE EXCEPTION 'Disqualification is admin only';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_admin_only_disqualification() FROM PUBLIC;

DROP TRIGGER IF EXISTS enforce_admin_only_disqualification_trigger ON public.clinic_appointments;
CREATE TRIGGER enforce_admin_only_disqualification_trigger
BEFORE INSERT OR UPDATE OF outcome, disqualified_reason, disqualified_at, disqualified_by
ON public.clinic_appointments
FOR EACH ROW
EXECUTE FUNCTION public.enforce_admin_only_disqualification();