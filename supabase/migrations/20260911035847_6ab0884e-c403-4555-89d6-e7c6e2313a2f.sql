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
    -- Only signed-in end users are policed here. Service-role/admin-key writes
    -- (the automatic refund pipeline) and direct maintenance SQL carry no
    -- end-user identity and pass through.
    IF auth.uid() IS NOT NULL AND coalesce(auth.role(), '') = 'authenticated' THEN
      IF NOT public.is_admin_user() THEN
        RAISE EXCEPTION 'Refunds can only be recorded by Admin. Please contact Admin.';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_refund_fields() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guard_refund_fields() FROM anon;
REVOKE ALL ON FUNCTION public.guard_refund_fields() FROM authenticated;