-- A clinic team member may consult, perform procedures, or do both.
-- Keep existing consultation behaviour unless a role is explicitly changed.
ALTER TABLE public.partner_doctors
  ADD COLUMN IF NOT EXISTS conducts_consultations boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS performs_procedures boolean NOT NULL DEFAULT false;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.partner_doctors'::regclass AND conname = 'partner_doctors_has_care_role') THEN
    ALTER TABLE public.partner_doctors ADD CONSTRAINT partner_doctors_has_care_role CHECK (conducts_consultations OR performs_procedures);
  END IF;
END $$;

-- Restore the Boss profile that was renamed from Dr Jai to Debra, preserving
-- the original ID, surgeon biography and historical appointment references.
-- Debra gets her own profile with only the name/title confirmed by the owner.
DO $$
DECLARE
  boss_id uuid;
  renamed_id uuid;
  jai_id uuid;
BEGIN
  IF (SELECT count(*) FROM public.partner_clinics WHERE clinic_name = 'Boss Clinic') > 1 THEN
    RAISE EXCEPTION 'Multiple Boss Clinic records: review before applying profile repair';
  END IF;
  SELECT id INTO boss_id FROM public.partner_clinics WHERE clinic_name = 'Boss Clinic';
  IF boss_id IS NULL THEN RETURN; END IF;

  IF EXISTS (SELECT name FROM public.partner_doctors WHERE clinic_id = boss_id AND name IN ('Debra Best', 'Dr Jai') GROUP BY name HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Duplicate Boss team profiles: review before applying profile repair';
  END IF;
  SELECT id INTO renamed_id FROM public.partner_doctors
    WHERE clinic_id = boss_id AND name = 'Debra Best'
      AND what_makes_them_different LIKE 'A qualified surgeon%';
  SELECT id INTO jai_id FROM public.partner_doctors
    WHERE clinic_id = boss_id AND name = 'Dr Jai';

  IF renamed_id IS NOT NULL THEN
    IF jai_id IS NOT NULL THEN
      RAISE EXCEPTION 'Both Jai and a Debra profile with surgeon details exist: review before merging';
    END IF;
    UPDATE public.partner_doctors SET name = 'Dr Jai', title = 'Hair Transplant Surgeon',
      conducts_consultations = false, performs_procedures = true
      WHERE id = renamed_id;
    jai_id := renamed_id;
  END IF;

  IF jai_id IS NULL THEN
    RAISE EXCEPTION 'Could not identify Dr Jai profile to preserve; review Boss Clinic records';
  END IF;
  UPDATE public.partner_doctors SET conducts_consultations = false, performs_procedures = true
    WHERE id = jai_id;

  IF NOT EXISTS (SELECT 1 FROM public.partner_doctors WHERE clinic_id = boss_id AND name = 'Debra Best') THEN
    INSERT INTO public.partner_doctors (clinic_id, name, title, conducts_consultations, performs_procedures)
      VALUES (boss_id, 'Debra Best', 'Hair Regrowth Specialist', true, false);
  ELSE
    UPDATE public.partner_doctors SET conducts_consultations = true, performs_procedures = false
      WHERE clinic_id = boss_id AND name = 'Debra Best';
  END IF;
END;
$$;

-- Automatic appointment assignment must only select consultation providers.
CREATE OR REPLACE FUNCTION public.fill_appointment_doctor()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  d_id uuid;
  d_name text;
  n int;
BEGIN
  IF NEW.clinic_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.doctor_id IS NOT NULL THEN
    -- Old appointments keep their recorded provider; new assignments must be
    -- an active consultation provider belonging to this clinic.
    IF TG_OP = 'INSERT' OR NEW.doctor_id IS DISTINCT FROM OLD.doctor_id OR NEW.clinic_id IS DISTINCT FROM OLD.clinic_id THEN
      IF NOT EXISTS (SELECT 1 FROM public.partner_doctors WHERE id = NEW.doctor_id
        AND clinic_id = NEW.clinic_id AND is_active AND conducts_consultations) THEN
        RAISE EXCEPTION 'Select an active consultation provider at this clinic';
      END IF;
    END IF;
    IF NEW.doctor_name IS NULL OR btrim(NEW.doctor_name) = '' THEN
      SELECT concat_ws(' — ', name, nullif(btrim(title), '')) INTO d_name
        FROM public.partner_doctors WHERE id = NEW.doctor_id;
      IF d_name IS NOT NULL THEN NEW.doctor_name := d_name; END IF;
    END IF;
    RETURN NEW;
  END IF;
  SELECT count(*) INTO n FROM public.partner_doctors
    WHERE clinic_id = NEW.clinic_id AND is_active AND conducts_consultations;
  IF n = 1 THEN
    SELECT id, concat_ws(' — ', name, nullif(btrim(title), '')) INTO d_id, d_name
      FROM public.partner_doctors WHERE clinic_id = NEW.clinic_id AND is_active AND conducts_consultations;
    NEW.doctor_id := d_id;
    IF NEW.doctor_name IS NULL OR btrim(NEW.doctor_name) = '' THEN NEW.doctor_name := d_name; END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.fill_appointment_doctor() FROM PUBLIC, anon, authenticated;

-- Preserve the selected consultation provider in automated reminders.
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

  -- fill_appointment_doctor has already resolved the chosen consultation
  -- provider. Never take the oldest team profile (which may be a surgeon).
  v_doctor := NULLIF(btrim(NEW.doctor_name), '');

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

REVOKE ALL ON FUNCTION public.auto_create_appointment_reminder() FROM PUBLIC, anon, authenticated;
