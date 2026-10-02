-- Link reminders to the actual appointment, not the lead's current clinic.
ALTER TABLE public.appointment_reminders
  ADD COLUMN IF NOT EXISTS appointment_id uuid REFERENCES public.clinic_appointments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS three_day_sms_claim uuid,
  ADD COLUMN IF NOT EXISTS twentyfour_hour_sms_claim uuid;

-- Only backfill unambiguous matches. Unlinked/ambiguous records are never sent.
WITH candidates AS (
  SELECT r.id, a.id appointment_id,
    count(*) OVER (PARTITION BY r.id) reminder_matches,
    count(*) OVER (PARTITION BY a.id) appointment_matches
  FROM public.appointment_reminders r JOIN public.clinic_appointments a
    ON a.lead_id = r.lead_id AND a.appointment_date = r.booking_date
    AND a.appointment_time::time = r.booking_time
  WHERE r.appointment_id IS NULL
), matched AS (
  SELECT * FROM candidates WHERE reminder_matches = 1 AND appointment_matches = 1
)
UPDATE public.appointment_reminders r SET appointment_id = m.appointment_id
FROM matched m WHERE r.id = m.id
  AND NOT EXISTS (SELECT 1 FROM public.appointment_reminders x WHERE x.appointment_id = m.appointment_id);
CREATE UNIQUE INDEX IF NOT EXISTS appointment_reminders_appointment_unique
  ON public.appointment_reminders(appointment_id) WHERE appointment_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.auto_create_appointment_reminder()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_time time;
BEGIN
  BEGIN v_time := NEW.appointment_time::time; EXCEPTION WHEN others THEN v_time := NULL; END;
  INSERT INTO public.appointment_reminders (
    appointment_id, lead_id, patient_first_name, patient_last_name, patient_phone,
    doctor_name, booking_date, booking_time, status, booked_at
  ) VALUES (
    NEW.id, NEW.lead_id, split_part(COALESCE(NEW.patient_name, ''), ' ', 1),
    NULLIF(btrim(substring(COALESCE(NEW.patient_name, '') FROM position(' ' IN COALESCE(NEW.patient_name, '') || ' ') + 1)), ''),
    NEW.patient_phone, NEW.doctor_name, NEW.appointment_date, v_time,
    'confirmed', COALESCE(NEW.booked_at, now())
  ) ON CONFLICT (appointment_id) WHERE appointment_id IS NOT NULL DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.auto_create_appointment_reminder() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.sync_reminder_on_reschedule()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_time time; rescheduled boolean;
BEGIN
  BEGIN v_time := NEW.appointment_time::time; EXCEPTION WHEN others THEN v_time := NULL; END;
  rescheduled := NEW.appointment_date IS DISTINCT FROM OLD.appointment_date
    OR NEW.appointment_time IS DISTINCT FROM OLD.appointment_time;
  IF rescheduled OR NEW.doctor_name IS DISTINCT FROM OLD.doctor_name
    OR NEW.doctor_id IS DISTINCT FROM OLD.doctor_id OR NEW.clinic_id IS DISTINCT FROM OLD.clinic_id
    OR NEW.patient_phone IS DISTINCT FROM OLD.patient_phone OR NEW.patient_name IS DISTINCT FROM OLD.patient_name THEN
    UPDATE public.appointment_reminders SET
      booking_date = NEW.appointment_date, booking_time = v_time,
      doctor_name = NEW.doctor_name, patient_phone = NEW.patient_phone,
      patient_first_name = split_part(COALESCE(NEW.patient_name, ''), ' ', 1),
      patient_last_name = NULLIF(btrim(substring(COALESCE(NEW.patient_name, '') FROM position(' ' IN COALESCE(NEW.patient_name, '') || ' ') + 1)), ''),
      three_day_sms_sent = CASE WHEN rescheduled THEN false ELSE three_day_sms_sent END,
      three_day_sms_sent_at = CASE WHEN rescheduled THEN NULL ELSE three_day_sms_sent_at END,
      twentyfour_hour_sms_sent = CASE WHEN rescheduled THEN false ELSE twentyfour_hour_sms_sent END,
      twentyfour_hour_sms_sent_at = CASE WHEN rescheduled THEN NULL ELSE twentyfour_hour_sms_sent_at END,
      three_day_sms_claim = CASE WHEN rescheduled THEN NULL ELSE three_day_sms_claim END,
      twentyfour_hour_sms_claim = CASE WHEN rescheduled THEN NULL ELSE twentyfour_hour_sms_claim END,
      updated_at = now()
    WHERE appointment_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_reminder_on_reschedule() FROM PUBLIC, anon, authenticated;

-- Repair future Boss consultations only. Preserve history, dates and sent flags.
UPDATE public.clinic_appointments a SET doctor_id = d.id,
  doctor_name = concat_ws(' — ', d.name, nullif(btrim(d.title), ''))
FROM public.partner_clinics c, public.partner_doctors d
WHERE a.clinic_id = c.id AND c.clinic_name = 'Boss Clinic'
  AND d.clinic_id = c.id AND d.name = 'Debra Best' AND d.is_active AND d.conducts_consultations
  AND (SELECT count(*) FROM public.partner_doctors x WHERE x.clinic_id = c.id AND x.name = 'Debra Best' AND x.is_active AND x.conducts_consultations) = 1
  AND a.appointment_date >= (now() AT TIME ZONE 'Australia/Sydney')::date
  AND a.outcome IS NULL AND a.disqualified_at IS NULL
  AND EXISTS (SELECT 1 FROM public.partner_doctors old WHERE old.id = a.doctor_id AND old.clinic_id = c.id AND old.name = 'Dr Jai' AND NOT old.conducts_consultations);

-- Atomic claim prevents concurrent cron/manual runs sending the same reminder.
-- A network timeout leaves the claim in place for review, avoiding blind retries.
CREATE OR REPLACE FUNCTION public.claim_appointment_reminder(
  p_id uuid, p_kind text, p_claim uuid, p_updated_at timestamptz
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE changed integer;
BEGIN
  IF p_kind NOT IN ('3day', '24h') THEN RAISE EXCEPTION 'Invalid reminder kind'; END IF;
  UPDATE public.appointment_reminders r SET
    three_day_sms_claim = CASE WHEN p_kind = '3day' THEN p_claim ELSE three_day_sms_claim END,
    twentyfour_hour_sms_claim = CASE WHEN p_kind = '24h' THEN p_claim ELSE twentyfour_hour_sms_claim END
  WHERE r.id = p_id AND r.updated_at = p_updated_at AND r.status = 'confirmed'
    AND r.booking_date = (now() AT TIME ZONE 'Australia/Sydney')::date + CASE WHEN p_kind = '3day' THEN 3 ELSE 1 END
    AND CASE WHEN p_kind = '3day' THEN NOT r.three_day_sms_sent AND r.three_day_sms_claim IS NULL
      ELSE NOT r.twentyfour_hour_sms_sent AND r.twentyfour_hour_sms_claim IS NULL END
    AND EXISTS (SELECT 1 FROM public.clinic_appointments a WHERE a.id = r.appointment_id
      AND a.appointment_date = r.booking_date AND a.appointment_time::time = r.booking_time
      AND a.outcome IS NULL AND a.disqualified_at IS NULL);
  GET DIAGNOSTICS changed = ROW_COUNT;
  RETURN changed = 1;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_appointment_reminder(uuid,text,uuid,timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_appointment_reminder(uuid,text,uuid,timestamptz) TO service_role;
