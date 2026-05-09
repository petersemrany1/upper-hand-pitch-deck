CREATE OR REPLACE FUNCTION public.sync_intel_to_clinic_appointments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.call_notes IS DISTINCT FROM OLD.call_notes THEN
    UPDATE public.clinic_appointments
    SET intel_notes = NEW.call_notes
    WHERE lead_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_intel_to_clinic_appointments ON public.meta_leads;

CREATE TRIGGER trg_sync_intel_to_clinic_appointments
AFTER UPDATE OF call_notes ON public.meta_leads
FOR EACH ROW
EXECUTE FUNCTION public.sync_intel_to_clinic_appointments();