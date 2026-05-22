
-- Trigger function: auto-create appointment_reminders row for each clinic_appointments insert
CREATE OR REPLACE FUNCTION public.auto_create_appointment_reminder()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_first text;
  v_last text;
  v_doctor text;
  v_time time;
BEGIN
  -- Skip if a reminder already exists for this lead+date+time
  IF NEW.lead_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.appointment_reminders
      WHERE lead_id = NEW.lead_id
        AND booking_date = NEW.appointment_date
    ) THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Split patient_name into first/last
  v_first := split_part(COALESCE(NEW.patient_name, ''), ' ', 1);
  v_last := NULLIF(trim(substring(COALESCE(NEW.patient_name, '') FROM position(' ' IN COALESCE(NEW.patient_name, '') || ' ') + 1)), '');

  -- Get doctor name from clinic (first active doctor) — best-effort
  SELECT name INTO v_doctor
  FROM public.partner_doctors
  WHERE clinic_id = NEW.clinic_id AND is_active = true
  ORDER BY created_at ASC
  LIMIT 1;

  -- Parse appointment_time (text) to time, best-effort
  BEGIN
    v_time := NEW.appointment_time::time;
  EXCEPTION WHEN others THEN
    v_time := NULL;
  END;

  INSERT INTO public.appointment_reminders (
    lead_id, patient_first_name, patient_last_name, patient_phone,
    doctor_name, booking_date, booking_time, status
  ) VALUES (
    NEW.lead_id, v_first, v_last, NEW.patient_phone,
    v_doctor, NEW.appointment_date, v_time, 'confirmed'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_create_appointment_reminder ON public.clinic_appointments;
CREATE TRIGGER trg_auto_create_appointment_reminder
AFTER INSERT ON public.clinic_appointments
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_appointment_reminder();

-- Backfill: today or future appointments missing reminders
INSERT INTO public.appointment_reminders (
  lead_id, patient_first_name, patient_last_name, patient_phone,
  doctor_name, booking_date, booking_time, status
)
SELECT
  ca.lead_id,
  split_part(COALESCE(ca.patient_name, ''), ' ', 1) AS patient_first_name,
  NULLIF(trim(substring(COALESCE(ca.patient_name, '') FROM position(' ' IN COALESCE(ca.patient_name, '') || ' ') + 1)), '') AS patient_last_name,
  ca.patient_phone,
  (SELECT name FROM public.partner_doctors pd WHERE pd.clinic_id = ca.clinic_id AND pd.is_active = true ORDER BY pd.created_at ASC LIMIT 1) AS doctor_name,
  ca.appointment_date,
  (CASE WHEN ca.appointment_time ~ '^[0-9]{1,2}:[0-9]{2}' THEN ca.appointment_time::time ELSE NULL END) AS booking_time,
  'confirmed'
FROM public.clinic_appointments ca
WHERE ca.appointment_date >= (now() AT TIME ZONE 'Australia/Sydney')::date
  AND COALESCE(ca.outcome, '') NOT IN ('cancelled', 'noshow')
  AND NOT EXISTS (
    SELECT 1 FROM public.appointment_reminders ar
    WHERE ar.lead_id = ca.lead_id
      AND ar.booking_date = ca.appointment_date
  )
  AND ca.lead_id IS NOT NULL;
