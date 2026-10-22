-- Clinic-specific reminders. Existing booking confirmations are separate from this workflow.
CREATE TABLE IF NOT EXISTS public.clinic_reminder_settings (
  clinic_id uuid PRIMARY KEY REFERENCES public.partner_clinics(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'reminders' CHECK (mode IN ('off','reminders','confirmation')),
  timezone text NOT NULL DEFAULT 'Australia/Sydney' CHECK (timezone IN ('Australia/Perth','Australia/Melbourne','Australia/Sydney','Australia/Brisbane','Australia/Adelaide','Australia/Darwin','Australia/Hobart')),
  normal_send_time time NOT NULL DEFAULT '13:00' CHECK (normal_send_time BETWEEN '09:00' AND '18:00'),
  alert_email text NOT NULL DEFAULT 'peter@gobold.com.au' CHECK (alert_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  call_days integer[] NOT NULL DEFAULT ARRAY[1,2,3,4,5] CHECK (cardinality(call_days)>0 AND call_days <@ ARRAY[0,1,2,3,4,5,6]),
  closed_dates date[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.clinic_reminder_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS reminder_settings_read ON public.clinic_reminder_settings;
CREATE POLICY reminder_settings_read ON public.clinic_reminder_settings FOR SELECT TO authenticated USING (public.has_sales_role(ARRAY['admin','rep']));
GRANT SELECT ON public.clinic_reminder_settings TO authenticated;
GRANT ALL ON public.clinic_reminder_settings TO service_role;

CREATE OR REPLACE FUNCTION public.default_clinic_reminder_settings() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE zone text;
BEGIN
  zone:=CASE upper(coalesce(NEW.state,'')) WHEN 'WA' THEN 'Australia/Perth' WHEN 'VIC' THEN 'Australia/Melbourne' WHEN 'QLD' THEN 'Australia/Brisbane' WHEN 'SA' THEN 'Australia/Adelaide' WHEN 'NT' THEN 'Australia/Darwin' WHEN 'TAS' THEN 'Australia/Hobart' ELSE 'Australia/Sydney' END;
  INSERT INTO clinic_reminder_settings(clinic_id,timezone,normal_send_time) VALUES(NEW.id,zone,((current_date+time '05:00') AT TIME ZONE 'UTC' AT TIME ZONE zone)::time) ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS clinic_reminder_settings_default ON public.partner_clinics;
CREATE TRIGGER clinic_reminder_settings_default AFTER INSERT ON public.partner_clinics FOR EACH ROW EXECUTE FUNCTION public.default_clinic_reminder_settings();
-- Only the named Perth partner opts in initially; future clinics start with ordinary reminders.
INSERT INTO public.clinic_reminder_settings(clinic_id,mode,timezone,normal_send_time)
SELECT id,CASE WHEN clinic_name='Boss Clinic' AND (upper(state)='WA' OR city ILIKE '%perth%') THEN 'confirmation' ELSE 'reminders' END,
  zone,((current_date+time '05:00') AT TIME ZONE 'UTC' AT TIME ZONE zone)::time
FROM (SELECT *,CASE upper(coalesce(state,'')) WHEN 'WA' THEN 'Australia/Perth' WHEN 'VIC' THEN 'Australia/Melbourne' WHEN 'QLD' THEN 'Australia/Brisbane' WHEN 'SA' THEN 'Australia/Adelaide' WHEN 'NT' THEN 'Australia/Darwin' WHEN 'TAS' THEN 'Australia/Hobart' ELSE 'Australia/Sydney' END zone FROM public.partner_clinics) c
ON CONFLICT DO NOTHING;

ALTER TABLE public.appointment_reminders
  ADD COLUMN IF NOT EXISTS confirmation_revision uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS confirmation_state text NOT NULL DEFAULT 'not_requested' CHECK (confirmation_state IN ('not_requested','awaiting_reply','confirmed','needs_call')),
  ADD COLUMN IF NOT EXISTS confirmation_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmation_followup_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmation_email_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmation_ack_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmation_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmation_method text CHECK (confirmation_method IN ('sms','phone')),
  ADD COLUMN IF NOT EXISTS confirmation_reason text,
  ADD COLUMN IF NOT EXISTS confirmation_last_reply text,
  ADD COLUMN IF NOT EXISTS confirmation_last_reply_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmation_call_result text,
  ADD COLUMN IF NOT EXISTS confirmation_last_call_at timestamptz;

CREATE TABLE IF NOT EXISTS public.appointment_reminder_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id uuid NOT NULL REFERENCES public.appointment_reminders(id) ON DELETE CASCADE,
  revision uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('3day','24h','request','followup','call_email','ack')),
  status text NOT NULL DEFAULT 'sending' CHECK (status IN ('sending','accepted','failed','unknown','delivered','undelivered')),
  body text NOT NULL,
  destination text NOT NULL,
  provider_id text,
  error text,
  attempts integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(reminder_id,revision,kind)
);
CREATE INDEX IF NOT EXISTS reminder_delivery_provider ON public.appointment_reminder_deliveries(provider_id) WHERE provider_id IS NOT NULL;
ALTER TABLE public.appointment_reminder_deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS reminder_deliveries_read ON public.appointment_reminder_deliveries;
CREATE POLICY reminder_deliveries_read ON public.appointment_reminder_deliveries FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.appointment_reminders r WHERE r.id=reminder_id AND public.can_manage_booking(r.appointment_id)));
GRANT SELECT ON public.appointment_reminder_deliveries TO authenticated;
GRANT ALL ON public.appointment_reminder_deliveries TO service_role;

CREATE TABLE IF NOT EXISTS public.patient_sms_opt_outs(phone text PRIMARY KEY,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.appointment_reply_receipts(provider_id text PRIMARY KEY,created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.patient_sms_opt_outs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_reply_receipts ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.patient_sms_opt_outs,public.appointment_reply_receipts TO service_role;
CREATE OR REPLACE FUNCTION public.reminder_phone(p_phone text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path=public AS $$
  SELECT CASE WHEN digits LIKE '0%' THEN '+61'||substring(digits FROM 2) WHEN digits LIKE '61%' THEN '+'||digits WHEN p_phone LIKE '+%' THEN '+'||digits ELSE '+61'||digits END FROM (SELECT regexp_replace(coalesce(p_phone,''),'[^0-9]','','g') digits) p
$$;

CREATE OR REPLACE FUNCTION public.reset_appointment_confirmation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.appointment_date IS DISTINCT FROM OLD.appointment_date OR NEW.appointment_time IS DISTINCT FROM OLD.appointment_time OR NEW.clinic_id IS DISTINCT FROM OLD.clinic_id OR NEW.patient_phone IS DISTINCT FROM OLD.patient_phone THEN
    UPDATE appointment_reminders SET confirmation_revision=gen_random_uuid(),confirmation_state='not_requested',
      confirmation_requested_at=null,confirmation_followup_at=null,confirmation_email_at=null,confirmation_ack_at=null,
      confirmation_confirmed_at=null,confirmation_method=null,confirmation_reason=null,confirmation_last_reply=null,
      confirmation_last_reply_at=null,confirmation_call_result=null,confirmation_last_call_at=null,
      three_day_sms_sent=false,twentyfour_hour_sms_sent=false,three_day_sms_sent_at=null,twentyfour_hour_sms_sent_at=null,
      three_day_sms_claim=null,twentyfour_hour_sms_claim=null,schedule_changed_at=now(),updated_at=now()
    WHERE appointment_id=NEW.id;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS zz_reset_appointment_confirmation ON public.clinic_appointments;
CREATE TRIGGER zz_reset_appointment_confirmation AFTER UPDATE ON public.clinic_appointments FOR EACH ROW EXECUTE FUNCTION public.reset_appointment_confirmation();

CREATE OR REPLACE FUNCTION public.save_clinic_reminder_settings(p_clinic uuid,p_mode text,p_timezone text,p_email text,p_days integer[],p_closed date[],p_time time,p_version timestamptz)
RETURNS public.clinic_reminder_settings LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE old_settings clinic_reminder_settings; saved clinic_reminder_settings;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.booking_sales_actor() WHERE role='admin') THEN RAISE EXCEPTION 'Admin access required'; END IF;
  SELECT * INTO old_settings FROM clinic_reminder_settings WHERE clinic_id=p_clinic FOR UPDATE;
  IF NOT FOUND OR old_settings.updated_at IS DISTINCT FROM p_version THEN RAISE EXCEPTION 'Settings changed. Refresh and try again.'; END IF;
  UPDATE clinic_reminder_settings SET mode=p_mode,timezone=p_timezone,alert_email=lower(trim(p_email)),call_days=p_days,closed_dates=p_closed,normal_send_time=p_time,updated_at=clock_timestamp() WHERE clinic_id=p_clinic RETURNING * INTO saved;
  IF old_settings.mode<>p_mode THEN
    UPDATE appointment_reminders r SET confirmation_revision=gen_random_uuid(),confirmation_state='not_requested',confirmation_reason=null,
      confirmation_requested_at=null,confirmation_followup_at=null,confirmation_email_at=null,confirmation_ack_at=null,
      confirmation_confirmed_at=null,confirmation_method=null,confirmation_call_result=null,confirmation_last_call_at=null,updated_at=now()
    FROM clinic_appointments a WHERE r.appointment_id=a.id AND a.clinic_id=p_clinic AND r.status='confirmed'
      AND r.confirmation_state<>'confirmed' AND coalesce(r.confirmation_reason,'') NOT IN ('patient_reply','opt_out','delivery_failed');
  END IF;
  RETURN saved;
END $$;

CREATE OR REPLACE FUNCTION public.record_appointment_confirmation_call(p_reminder uuid,p_revision uuid,p_result text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r appointment_reminders;
BEGIN
  SELECT * INTO r FROM appointment_reminders WHERE id=p_reminder FOR UPDATE;
  IF NOT FOUND OR NOT public.can_manage_booking(r.appointment_id) THEN RAISE EXCEPTION 'Booking access required'; END IF;
  IF r.confirmation_revision<>p_revision OR r.status<>'confirmed' THEN RAISE EXCEPTION 'Appointment changed. Refresh and try again.'; END IF;
  IF EXISTS(SELECT 1 FROM clinic_appointments WHERE id=r.appointment_id AND (outcome IS NOT NULL OR disqualified_at IS NOT NULL)) THEN RAISE EXCEPTION 'Appointment is no longer active'; END IF;
  IF r.confirmation_state='confirmed' AND p_result<>'confirmed' THEN RAISE EXCEPTION 'The patient has already confirmed. Refresh to see the latest status.'; END IF;
  IF p_result NOT IN ('confirmed','no_answer','voicemail') THEN RAISE EXCEPTION 'Invalid call result'; END IF;
  UPDATE appointment_reminders SET confirmation_state=CASE WHEN p_result='confirmed' THEN 'confirmed' ELSE 'needs_call' END,
    confirmation_confirmed_at=CASE WHEN p_result='confirmed' THEN now() ELSE confirmation_confirmed_at END,
    confirmation_method=CASE WHEN p_result='confirmed' THEN 'phone' ELSE confirmation_method END,
    confirmation_reason=CASE WHEN p_result='confirmed' THEN null ELSE coalesce(confirmation_reason,'no_reply') END,
    confirmation_call_result=p_result,confirmation_last_call_at=now(),updated_at=now() WHERE id=p_reminder;
END $$;

-- Service-only atomic claims prevent duplicate cron runs and check the latest reply/settings.
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

CREATE OR REPLACE FUNCTION public.finish_confirmation_delivery(p_delivery uuid,p_status text,p_provider text DEFAULT null,p_error text DEFAULT null)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d appointment_reminder_deliveries; request_is_day_before boolean;
BEGIN
  IF p_status NOT IN ('accepted','failed','unknown','delivered','undelivered') THEN RAISE EXCEPTION 'Invalid delivery status'; END IF;
  -- Every delivery writer locks the booking before the delivery (same order as claiming).
  PERFORM 1 FROM appointment_reminders WHERE id=(SELECT reminder_id FROM appointment_reminder_deliveries WHERE id=p_delivery) FOR UPDATE;
  UPDATE appointment_reminder_deliveries SET status=CASE WHEN status IN ('delivered','undelivered') AND p_status='accepted' THEN status ELSE p_status END,
    provider_id=coalesce(p_provider,provider_id),error=CASE WHEN status IN ('delivered','undelivered') AND p_status='accepted' THEN error ELSE p_error END,updated_at=now() WHERE id=p_delivery RETURNING * INTO d;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT (now() AT TIME ZONE s.timezone)::date=r.booking_date-1 INTO request_is_day_before FROM appointment_reminders r JOIN clinic_appointments a ON a.id=r.appointment_id JOIN clinic_reminder_settings s ON s.clinic_id=a.clinic_id WHERE r.id=d.reminder_id;
  IF d.status IN ('accepted','delivered') THEN
    UPDATE appointment_reminders SET
      three_day_sms_sent=three_day_sms_sent OR d.kind='3day',three_day_sms_sent_at=CASE WHEN d.kind='3day' THEN coalesce(three_day_sms_sent_at,now()) ELSE three_day_sms_sent_at END,
      twentyfour_hour_sms_sent=twentyfour_hour_sms_sent OR (d.kind='24h' OR (d.kind='request' AND request_is_day_before)),twentyfour_hour_sms_sent_at=CASE WHEN (d.kind='24h' OR (d.kind='request' AND request_is_day_before)) THEN coalesce(twentyfour_hour_sms_sent_at,now()) ELSE twentyfour_hour_sms_sent_at END,
      confirmation_requested_at=CASE WHEN d.kind='request' THEN coalesce(confirmation_requested_at,now()) ELSE confirmation_requested_at END,
      confirmation_followup_at=CASE WHEN d.kind='followup' THEN coalesce(confirmation_followup_at,now()) ELSE confirmation_followup_at END,
      confirmation_email_at=CASE WHEN d.kind='call_email' THEN coalesce(confirmation_email_at,now()) ELSE confirmation_email_at END,
      confirmation_ack_at=CASE WHEN d.kind='ack' THEN coalesce(confirmation_ack_at,now()) ELSE confirmation_ack_at END,
      confirmation_state=CASE WHEN d.kind='request' AND confirmation_state='not_requested' THEN 'awaiting_reply' ELSE confirmation_state END,updated_at=now()
    WHERE id=d.reminder_id AND confirmation_revision=d.revision;
  ELSIF d.kind IN ('3day','24h','request','followup') THEN
    UPDATE appointment_reminders r SET confirmation_state='needs_call',confirmation_reason='delivery_failed',updated_at=now()
    FROM clinic_appointments a JOIN clinic_reminder_settings s ON s.clinic_id=a.clinic_id
    WHERE r.id=d.reminder_id AND r.confirmation_revision=d.revision AND r.appointment_id=a.id AND s.mode='confirmation' AND r.confirmation_state<>'confirmed';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.consume_appointment_confirmation_reply(p_sid text,p_from text,p_to text,p_body text,p_opt_out text DEFAULT null)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_phone text:=reminder_phone(p_from); message text:=lower(trim(p_body)); candidates uuid[]; chosen uuid; latest_sid text; yes_reply boolean;
BEGIN
  IF coalesce(p_sid,'')='' OR reminder_phone(p_to)<>'+61468031075' THEN RETURN jsonb_build_object('matched',false); END IF;
  INSERT INTO appointment_reply_receipts(provider_id) VALUES(p_sid) ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN RETURN jsonb_build_object('duplicate',true); END IF;
  IF upper(coalesce(p_opt_out,''))='STOP' OR message IN ('stop','stopall','unsubscribe','cancel','end','quit') THEN
    INSERT INTO patient_sms_opt_outs(phone) VALUES(v_phone) ON CONFLICT DO NOTHING;
  ELSIF upper(coalesce(p_opt_out,''))='START' OR message IN ('start','unstop') THEN
    DELETE FROM patient_sms_opt_outs o WHERE o.phone=v_phone;
    RETURN jsonb_build_object('opted_in',true);
  END IF;
  PERFORM 1 FROM appointment_reminders WHERE reminder_phone(patient_phone)=v_phone FOR UPDATE;
  SELECT array_agg(r.id) INTO candidates FROM appointment_reminders r JOIN clinic_appointments a ON a.id=r.appointment_id JOIN clinic_reminder_settings s ON s.clinic_id=a.clinic_id
  WHERE reminder_phone(r.patient_phone)=v_phone AND r.status='confirmed' AND a.outcome IS NULL AND a.disqualified_at IS NULL
    AND (a.appointment_date+a.appointment_time::time) AT TIME ZONE s.timezone>now()
    AND s.mode='confirmation' AND EXISTS(SELECT 1 FROM appointment_reminder_deliveries d WHERE d.reminder_id=r.id AND d.revision=r.confirmation_revision AND d.kind IN ('request','followup') AND d.status IN ('sending','accepted','delivered','unknown'));
  IF cardinality(candidates) IS NULL THEN RETURN jsonb_build_object('matched',false); END IF;
  IF cardinality(candidates)=1 AND message ~ '^(yes|y|ok|thanks|thank you|stop|stopall|unsubscribe|cancel|end|quit)[.![:space:]]*$'
    AND EXISTS(SELECT 1 FROM appointment_reminders WHERE id=candidates[1] AND confirmation_state='confirmed') THEN
    UPDATE appointment_reminders SET confirmation_last_reply=left(p_body,2000),confirmation_last_reply_at=now() WHERE id=candidates[1];
    RETURN jsonb_build_object('matched',true,'already_confirmed',true);
  END IF;
  -- An unrelated outgoing conversation or multiple appointments makes a bare YES ambiguous.
  SELECT twilio_message_sid INTO latest_sid FROM sms_messages WHERE direction='outbound' AND reminder_phone(to_number)=v_phone ORDER BY coalesce(sent_at,created_at) DESC,id DESC LIMIT 1;
  yes_reply:=message ~ '^(yes|y)[.![:space:]]*$' AND cardinality(candidates)=1
    AND EXISTS(SELECT 1 FROM appointment_reminder_deliveries d WHERE d.reminder_id=candidates[1] AND d.provider_id=latest_sid AND d.kind IN ('request','followup','ack') AND d.revision=(SELECT confirmation_revision FROM appointment_reminders WHERE id=candidates[1]))
    AND NOT EXISTS(SELECT 1 FROM patient_sms_opt_outs o WHERE o.phone=v_phone)
    AND NOT EXISTS(SELECT 1 FROM sms_messages m WHERE m.direction='outbound' AND reminder_phone(m.to_number)=v_phone
      AND coalesce(m.sent_at,m.created_at)=(SELECT max(coalesce(sent_at,created_at)) FROM sms_messages WHERE direction='outbound' AND reminder_phone(to_number)=v_phone)
      AND NOT EXISTS(SELECT 1 FROM appointment_reminder_deliveries d WHERE d.provider_id=m.twilio_message_sid AND d.reminder_id=candidates[1] AND d.revision=(SELECT confirmation_revision FROM appointment_reminders WHERE id=candidates[1]) AND d.kind IN ('request','followup','ack')));
  FOREACH chosen IN ARRAY candidates LOOP
    PERFORM 1 FROM appointment_reminders WHERE id=chosen FOR UPDATE;
    UPDATE appointment_reminders SET confirmation_last_reply=left(p_body,2000),confirmation_last_reply_at=now(),
      confirmation_state=CASE WHEN yes_reply THEN 'confirmed' ELSE 'needs_call' END,
      confirmation_reason=CASE WHEN yes_reply THEN null WHEN EXISTS(SELECT 1 FROM patient_sms_opt_outs o WHERE o.phone=v_phone) THEN 'opt_out' ELSE 'patient_reply' END,
      confirmation_confirmed_at=CASE WHEN yes_reply THEN now() ELSE null END,confirmation_method=CASE WHEN yes_reply THEN 'sms' ELSE null END,
      updated_at=now()
    WHERE id=chosen AND status='confirmed';
  END LOOP;
  RETURN jsonb_build_object('matched',true,'confirmed',yes_reply,'ambiguous',cardinality(candidates)>1);
END $$;

-- Provider callbacks update both the inbox and the appointment; delivered never means confirmed.
CREATE OR REPLACE FUNCTION public.sync_confirmation_delivery_status() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE delivery uuid;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.twilio_message_sid IS NOT NULL THEN
    SELECT id INTO delivery FROM appointment_reminder_deliveries WHERE provider_id=NEW.twilio_message_sid LIMIT 1;
    IF delivery IS NOT NULL AND (NEW.status='delivered' OR NEW.status LIKE 'undelivered%' OR NEW.status LIKE 'failed%') THEN
      PERFORM finish_confirmation_delivery(delivery,CASE WHEN NEW.status='delivered' THEN 'delivered' ELSE 'undelivered' END,NEW.twilio_message_sid,CASE WHEN NEW.status='delivered' THEN null ELSE NEW.status END);
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS confirmation_delivery_status ON public.sms_messages;
CREATE TRIGGER confirmation_delivery_status AFTER UPDATE OF status ON public.sms_messages FOR EACH ROW EXECUTE FUNCTION public.sync_confirmation_delivery_status();

REVOKE ALL ON FUNCTION public.default_clinic_reminder_settings(),public.reset_appointment_confirmation(),public.sync_confirmation_delivery_status() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.save_clinic_reminder_settings(uuid,text,text,text,integer[],date[],time,timestamptz),public.record_appointment_confirmation_call(uuid,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_clinic_reminder_settings(uuid,text,text,text,integer[],date[],time,timestamptz),public.record_appointment_confirmation_call(uuid,uuid,text) TO authenticated;
REVOKE ALL ON FUNCTION public.claim_confirmation_delivery(uuid,uuid,text,timestamptz,text,text),public.finish_confirmation_delivery(uuid,text,text,text),public.consume_appointment_confirmation_reply(text,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_confirmation_delivery(uuid,uuid,text,timestamptz,text,text),public.finish_confirmation_delivery(uuid,text,text,text),public.consume_appointment_confirmation_reply(text,text,text,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.recover_stale_confirmation_deliveries() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d record;
BEGIN
  FOR d IN SELECT id,reminder_id FROM appointment_reminder_deliveries WHERE status='sending' AND updated_at<now()-interval '10 minutes' LOOP
    PERFORM 1 FROM appointment_reminders WHERE id=d.reminder_id FOR UPDATE SKIP LOCKED;
    IF FOUND AND EXISTS(SELECT 1 FROM appointment_reminder_deliveries WHERE id=d.id AND status='sending' AND updated_at<now()-interval '10 minutes') THEN
      PERFORM finish_confirmation_delivery(d.id,'unknown',null,'Sending interrupted. Check delivery before retrying.');
    END IF;
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.recover_stale_confirmation_deliveries() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.recover_stale_confirmation_deliveries() TO service_role;

-- Callback identity is part of the signed Twilio URL; this also handles callbacks arriving before inbox logging.
CREATE OR REPLACE FUNCTION public.record_confirmation_delivery_callback(p_delivery uuid,p_sid text,p_status text,p_error text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d appointment_reminder_deliveries;
BEGIN
  PERFORM 1 FROM appointment_reminders WHERE id=(SELECT reminder_id FROM appointment_reminder_deliveries WHERE id=p_delivery) FOR UPDATE;
  SELECT * INTO d FROM appointment_reminder_deliveries WHERE id=p_delivery FOR UPDATE;
  IF NOT FOUND OR d.kind='call_email' OR p_status NOT IN ('delivered','undelivered') OR (d.provider_id IS NOT NULL AND d.provider_id<>p_sid) THEN RETURN; END IF;
  PERFORM finish_confirmation_delivery(p_delivery,p_status,p_sid,p_error);
END $$;
REVOKE ALL ON FUNCTION public.record_confirmation_delivery_callback(uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_confirmation_delivery_callback(uuid,text,text,text) TO service_role;
