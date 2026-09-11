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
    -- session_user is the real connected role (current_user is rewritten by
    -- SECURITY DEFINER, which is why it must not be used here).
    IF session_user IN ('service_role', 'postgres', 'supabase_admin')
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

REVOKE ALL ON FUNCTION public.guard_refund_fields() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guard_refund_fields() FROM anon;
REVOKE ALL ON FUNCTION public.guard_refund_fields() FROM authenticated;