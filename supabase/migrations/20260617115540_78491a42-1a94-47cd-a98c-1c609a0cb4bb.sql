
ALTER TABLE public.clinic_appointments ADD COLUMN IF NOT EXISTS booked_at timestamptz;
ALTER TABLE public.appointment_reminders ADD COLUMN IF NOT EXISTS booked_at timestamptz;

UPDATE public.clinic_appointments SET booked_at = created_at WHERE booked_at IS NULL;
UPDATE public.appointment_reminders SET booked_at = created_at WHERE booked_at IS NULL;

ALTER TABLE public.clinic_appointments ALTER COLUMN booked_at SET DEFAULT now();
ALTER TABLE public.appointment_reminders ALTER COLUMN booked_at SET DEFAULT now();

ALTER TABLE public.clinic_appointments ALTER COLUMN booked_at SET NOT NULL;
ALTER TABLE public.appointment_reminders ALTER COLUMN booked_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_clinic_appointments_booked_at ON public.clinic_appointments(booked_at);
CREATE INDEX IF NOT EXISTS idx_appointment_reminders_booked_at ON public.appointment_reminders(booked_at);

-- Update the auto_create_appointment_reminder trigger to carry booked_at across from the originating appointment
CREATE OR REPLACE FUNCTION public.auto_create_appointment_reminder()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_first text;
  v_last text;
  v_doctor text;
  v_time time;
BEGIN
  IF NEW.lead_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.appointment_reminders
      WHERE lead_id = NEW.lead_id
        AND booking_date = NEW.appointment_date
    ) THEN
      RETURN NEW;
    END IF;
  END IF;

  v_first := split_part(COALESCE(NEW.patient_name, ''), ' ', 1);
  v_last := NULLIF(trim(substring(COALESCE(NEW.patient_name, '') FROM position(' ' IN COALESCE(NEW.patient_name, '') || ' ') + 1)), '');

  SELECT name INTO v_doctor
  FROM public.partner_doctors
  WHERE clinic_id = NEW.clinic_id AND is_active = true
  ORDER BY created_at ASC
  LIMIT 1;

  BEGIN
    v_time := NEW.appointment_time::time;
  EXCEPTION WHEN others THEN
    v_time := NULL;
  END;

  INSERT INTO public.appointment_reminders (
    lead_id, patient_first_name, patient_last_name, patient_phone,
    doctor_name, booking_date, booking_time, status, booked_at
  ) VALUES (
    NEW.lead_id, v_first, v_last, NEW.patient_phone,
    v_doctor, NEW.appointment_date, v_time, 'confirmed', COALESCE(NEW.booked_at, now())
  );

  RETURN NEW;
END;
$function$;
