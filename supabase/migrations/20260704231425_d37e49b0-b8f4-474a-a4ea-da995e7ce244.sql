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

  IF TG_OP = 'INSERT' THEN
    IF NEW.outcome = 'disqualified'
       OR NEW.disqualified_reason IS NOT NULL
       OR NEW.disqualified_at IS NOT NULL
       OR NEW.disqualified_by IS NOT NULL THEN
      RAISE EXCEPTION 'Disqualification is admin only';
    END IF;
    RETURN NEW;
  END IF;

  IF (NEW.outcome IS DISTINCT FROM OLD.outcome AND (NEW.outcome = 'disqualified' OR OLD.outcome = 'disqualified'))
     OR NEW.disqualified_reason IS DISTINCT FROM OLD.disqualified_reason
     OR NEW.disqualified_at IS DISTINCT FROM OLD.disqualified_at
     OR NEW.disqualified_by IS DISTINCT FROM OLD.disqualified_by THEN
    RAISE EXCEPTION 'Disqualification is admin only';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_admin_only_disqualification() FROM PUBLIC;