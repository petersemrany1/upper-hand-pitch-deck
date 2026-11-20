-- Internal follow-up alerts: 4:30pm Sydney, only after an unanswered second text.
-- Patient text times and clinic modes are unchanged.
ALTER TABLE public.clinic_reminder_settings
  DROP CONSTRAINT IF EXISTS clinic_reminder_settings_alert_email_check;
ALTER TABLE public.clinic_reminder_settings
  ADD CONSTRAINT clinic_reminder_settings_alert_email_check
  CHECK (alert_email ~ '^[^[:space:],@]+@[^[:space:],@]+\.[^[:space:],@]+(,[^[:space:],@]+@[^[:space:],@]+\.[^[:space:],@]+)*$');
ALTER TABLE public.clinic_reminder_settings ALTER COLUMN alert_email
  SET DEFAULT 'peter@gobold.com.au,nina@bold-marketing.com.au';
UPDATE public.clinic_reminder_settings
SET alert_email='peter@gobold.com.au,nina@bold-marketing.com.au', updated_at=clock_timestamp()
WHERE lower(trim(alert_email))='peter@gobold.com.au';

-- This predicate is also enforced under the booking lock, so a reply/call arriving
-- after the worker loaded its list suppresses the email. An explicit time makes
-- daylight-saving boundaries testable without changing the database clock.
CREATE OR REPLACE FUNCTION public.confirmation_call_alert_due(
  r public.appointment_reminders, s public.clinic_reminder_settings, p_now timestamptz
) RETURNS boolean LANGUAGE sql STABLE SET search_path=public AS $$
  SELECT coalesce(
    s.mode='confirmation'
    AND (p_now AT TIME ZONE 'Australia/Sydney')::time >= time '16:30'
    AND (p_now AT TIME ZONE 'Australia/Sydney')::time < time '17:00'
    AND extract(dow FROM p_now AT TIME ZONE 'Australia/Sydney')::integer=ANY(s.call_days)
    AND NOT ((p_now AT TIME ZONE 'Australia/Sydney')::date=ANY(s.closed_dates))
    AND (r.confirmation_state='awaiting_reply' OR (r.confirmation_state='needs_call' AND r.confirmation_reason='no_reply'))
    AND r.confirmation_requested_at IS NOT NULL
    AND r.confirmation_followup_at IS NOT NULL
    AND r.confirmation_followup_at <= p_now-interval '30 minutes'
    AND r.confirmation_email_at IS NULL
    AND r.confirmation_last_reply_at IS NULL
    AND r.confirmation_last_call_at IS NULL, false)
$$;
REVOKE ALL ON FUNCTION public.confirmation_call_alert_due(public.appointment_reminders,public.clinic_reminder_settings,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.confirmation_call_alert_due(public.appointment_reminders,public.clinic_reminder_settings,timestamptz) TO service_role;

CREATE OR REPLACE FUNCTION public.claim_confirmation_delivery(p_reminder uuid,p_revision uuid,p_kind text,p_settings_version timestamptz,p_body text,p_destination text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r appointment_reminders; a clinic_appointments; s clinic_reminder_settings; delivery uuid;
BEGIN
  SELECT * INTO r FROM appointment_reminders WHERE id=p_reminder FOR UPDATE;
  IF NOT FOUND OR r.confirmation_revision<>p_revision OR r.status<>'confirmed' THEN RETURN null; END IF;
  SELECT * INTO a FROM clinic_appointments WHERE id=r.appointment_id;
  SELECT * INTO s FROM clinic_reminder_settings WHERE clinic_id=a.clinic_id;
  IF s.mode IS NULL OR s.mode='off' OR s.updated_at<>p_settings_version OR a.outcome IS NOT NULL OR a.disqualified_at IS NOT NULL OR a.appointment_date<>r.booking_date OR a.appointment_time::time<>r.booking_time THEN RETURN null; END IF;
  IF (a.appointment_date+a.appointment_time::time) AT TIME ZONE s.timezone <= now() THEN RETURN null; END IF;
  IF p_kind IN ('request','followup','call_email','ack') AND s.mode<>'confirmation' THEN RETURN null; END IF;
  IF p_kind IN ('request','followup','call_email') AND r.confirmation_state='confirmed' THEN RETURN null; END IF;
  IF p_kind='call_email' AND NOT public.confirmation_call_alert_due(r,s,now()) THEN RETURN null; END IF;
  IF p_kind IN ('request','followup') AND r.confirmation_state='needs_call' THEN RETURN null; END IF;
  IF p_kind='ack' AND (r.confirmation_state<>'confirmed' OR r.confirmation_method<>'sms' OR r.confirmation_ack_at IS NOT NULL) THEN RETURN null; END IF;
  IF p_kind='3day' AND (r.three_day_sms_sent OR r.three_day_sms_claim IS NOT NULL) THEN RETURN null; END IF;
  IF p_kind='24h' AND (r.twentyfour_hour_sms_sent OR r.twentyfour_hour_sms_claim IS NOT NULL) THEN RETURN null; END IF;
  IF p_kind<>'call_email' AND EXISTS(SELECT 1 FROM patient_sms_opt_outs WHERE phone=reminder_phone(r.patient_phone)) THEN
    IF s.mode='confirmation' AND r.confirmation_state<>'confirmed' THEN UPDATE appointment_reminders SET confirmation_state='needs_call',confirmation_reason='opt_out' WHERE id=r.id; END IF;
    RETURN null;
  END IF;
  INSERT INTO appointment_reminder_deliveries(reminder_id,revision,kind,body,destination)
  VALUES(r.id,p_revision,p_kind,p_body,p_destination)
  ON CONFLICT(reminder_id,revision,kind) DO UPDATE SET status='sending',error=null,attempts=appointment_reminder_deliveries.attempts+1,updated_at=now(),body=excluded.body,destination=excluded.destination
    WHERE appointment_reminder_deliveries.status='failed' AND appointment_reminder_deliveries.attempts<3 AND appointment_reminder_deliveries.updated_at<now()-interval '5 minutes'
  RETURNING id INTO delivery;
  IF delivery IS NOT NULL AND p_kind='call_email' THEN
    UPDATE appointment_reminders SET confirmation_state='needs_call',confirmation_reason=coalesce(confirmation_reason,CASE WHEN confirmation_requested_at IS NULL THEN 'short_notice' ELSE 'no_reply' END) WHERE id=r.id;
  END IF;
  RETURN delivery;
END $$;

REVOKE ALL ON FUNCTION public.claim_confirmation_delivery(uuid,uuid,text,timestamptz,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_confirmation_delivery(uuid,uuid,text,timestamptz,text,text) TO service_role;
