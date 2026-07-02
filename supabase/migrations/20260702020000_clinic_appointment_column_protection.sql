-- Phase 8: tighten clinic-scoped writes.
--
-- Clinic portal users can UPDATE their own clinic_appointments rows (outcome,
-- consult summary, reschedules), but RLS is row-level only — nothing stopped
-- a clinic user from rewriting payment/linkage columns (deposit_amount,
-- stripe ids, refund state, clinic_id/lead_id). This trigger makes those
-- columns immutable for clinic users; admins and sales reps keep full access.

CREATE OR REPLACE FUNCTION public.protect_clinic_appointment_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Staff (admins + sales reps) may change anything.
  IF public.is_admin_user() OR public.has_sales_role(ARRAY['admin','rep']) THEN
    RETURN NEW;
  END IF;

  IF NEW.clinic_id            IS DISTINCT FROM OLD.clinic_id
     OR NEW.lead_id           IS DISTINCT FROM OLD.lead_id
     OR NEW.deposit_amount    IS DISTINCT FROM OLD.deposit_amount
     OR NEW.stripe_payment_intent_id IS DISTINCT FROM OLD.stripe_payment_intent_id
     OR NEW.stripe_refund_id  IS DISTINCT FROM OLD.stripe_refund_id
     OR NEW.refund_status     IS DISTINCT FROM OLD.refund_status
     OR NEW.refund_processed_at IS DISTINCT FROM OLD.refund_processed_at
  THEN
    RAISE EXCEPTION 'clinic users cannot modify payment or linkage columns on appointments';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_clinic_appointment_columns ON public.clinic_appointments;
CREATE TRIGGER trg_protect_clinic_appointment_columns
  BEFORE UPDATE ON public.clinic_appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_clinic_appointment_columns();
