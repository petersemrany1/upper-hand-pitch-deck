CREATE OR REPLACE FUNCTION public.guard_refund_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.refund_status IS DISTINCT FROM OLD.refund_status)
     OR (NEW.refund_processed_at IS DISTINCT FROM OLD.refund_processed_at)
     OR (NEW.stripe_refund_id IS DISTINCT FROM OLD.stripe_refund_id)
     OR (NEW.square_refund_id IS DISTINCT FROM OLD.square_refund_id) THEN
    IF current_setting('role', true) = 'service_role'
       OR current_user IN ('service_role', 'postgres', 'supabase_admin')
       OR auth.role() = 'service_role' THEN
      RETURN NEW;
    END IF;
    IF NOT public.is_admin_user() THEN
      RAISE EXCEPTION 'Refunds can only be recorded by Admin. Please contact Admin.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_refund_fields ON public.clinic_appointments;
CREATE TRIGGER trg_guard_refund_fields
  BEFORE UPDATE ON public.clinic_appointments
  FOR EACH ROW EXECUTE FUNCTION public.guard_refund_fields();