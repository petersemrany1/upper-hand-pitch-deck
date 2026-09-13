CREATE OR REPLACE FUNCTION public.fill_appointment_doctor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d_id uuid;
  d_name text;
  n int;
BEGIN
  IF NEW.clinic_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.doctor_id IS NOT NULL THEN
    IF NEW.doctor_name IS NULL OR btrim(NEW.doctor_name) = '' THEN
      SELECT name INTO d_name FROM public.partner_doctors WHERE id = NEW.doctor_id;
      IF d_name IS NOT NULL THEN NEW.doctor_name := d_name; END IF;
    END IF;
    RETURN NEW;
  END IF;

  SELECT count(*) INTO n FROM public.partner_doctors
   WHERE clinic_id = NEW.clinic_id AND is_active;

  IF n = 1 THEN
    SELECT id, name INTO d_id, d_name FROM public.partner_doctors
     WHERE clinic_id = NEW.clinic_id AND is_active;
    NEW.doctor_id := d_id;
    IF NEW.doctor_name IS NULL OR btrim(NEW.doctor_name) = '' THEN
      NEW.doctor_name := d_name;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fill_appointment_doctor_trg ON public.clinic_appointments;
CREATE TRIGGER fill_appointment_doctor_trg
BEFORE INSERT OR UPDATE OF clinic_id, doctor_id, doctor_name ON public.clinic_appointments
FOR EACH ROW EXECUTE FUNCTION public.fill_appointment_doctor();