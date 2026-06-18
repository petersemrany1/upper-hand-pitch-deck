-- Guard: a lead cannot be flipped to booked_deposit_paid unless a clinic_appointments
-- row already exists for that lead. Prevents the "deposit taken, clinic never told"
-- failure mode that happened with Tey Ashjaee on 2026-06-18.

CREATE OR REPLACE FUNCTION public.enforce_booking_before_status_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only enforce on transitions INTO booked_deposit_paid
  IF NEW.status = 'booked_deposit_paid'
     AND COALESCE(OLD.status, '') IS DISTINCT FROM 'booked_deposit_paid' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.clinic_appointments
      WHERE lead_id = NEW.id
    ) THEN
      RAISE EXCEPTION 'Cannot mark lead as booked_deposit_paid: no clinic appointment exists yet. Send the handover via the Book Appointment modal first.'
        USING HINT = 'Open the lead in the Sales Call portal and complete Book Appointment to send the Patient Intel handover email to the clinic.',
              ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_booking_before_status_lock ON public.meta_leads;
CREATE TRIGGER trg_enforce_booking_before_status_lock
  BEFORE UPDATE OF status ON public.meta_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_booking_before_status_lock();
