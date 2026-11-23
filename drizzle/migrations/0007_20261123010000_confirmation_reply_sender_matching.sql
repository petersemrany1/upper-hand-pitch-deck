-- Match confirmations to the actual SMS endpoints, including retired/replacement
-- senders. Never infer the receiving number from the currently active pool.
CREATE OR REPLACE FUNCTION public.confirmation_reply_matches(
  r public.appointment_reminders, p_from text, p_to text, p_received_at timestamptz
) RETURNS boolean LANGUAGE sql STABLE SET search_path=public AS $$
  SELECT public.reminder_phone(r.patient_phone)=public.reminder_phone(p_from)
    AND r.schedule_changed_at<=p_received_at
    AND EXISTS (
      SELECT 1 FROM public.appointment_reminder_deliveries d
      JOIN public.sms_messages m ON m.twilio_message_sid=d.provider_id AND m.direction='outbound'
      WHERE d.reminder_id=r.id AND d.revision=r.confirmation_revision
        AND d.kind IN ('request','followup') AND d.status IN ('sending','accepted','delivered','unknown')
        AND d.created_at<=p_received_at
        AND public.reminder_phone(m.to_number)=public.reminder_phone(p_from)
        AND public.reminder_phone(m.from_number)=public.reminder_phone(p_to)
    )
$$;

CREATE OR REPLACE FUNCTION public.consume_appointment_confirmation_reply(
  p_sid text,p_from text,p_to text,p_body text,p_opt_out text DEFAULT null
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_phone text:=reminder_phone(p_from);
  message text:=lower(trim(p_body));
  received_at timestamptz;
  candidates uuid[];
  chosen uuid;
  latest_sid text;
  yes_reply boolean;
  is_stop boolean:=upper(coalesce(p_opt_out,''))='STOP' OR message IN ('stop','stopall','unsubscribe','cancel','end','quit','revoke','optout');
  is_start boolean:=upper(coalesce(p_opt_out,''))='START' OR message IN ('start','unstop');
BEGIN
  IF coalesce(p_sid,'')='' OR v_phone !~ '^\+61[0-9]{9}$' OR reminder_phone(p_to) !~ '^\+61[0-9]{9}$' THEN
    RETURN jsonb_build_object('matched',false);
  END IF;
  -- The signed webhook stores the inbound message before invoking this function.
  -- Its original receipt time also makes recovery safe after later outgoing texts.
  SELECT m.created_at INTO received_at FROM sms_messages m
  WHERE m.twilio_message_sid=p_sid AND m.direction='inbound'
    AND reminder_phone(m.from_number)=v_phone AND reminder_phone(m.to_number)=reminder_phone(p_to)
    AND m.body IS NOT DISTINCT FROM p_body;
  IF NOT FOUND THEN RETURN jsonb_build_object('matched',false,'reason','inbound_message_missing'); END IF;
  IF EXISTS(SELECT 1 FROM appointment_reply_receipts WHERE provider_id=p_sid) THEN
    RETURN jsonb_build_object('duplicate',true);
  END IF;
  -- Consistent lock order for shared phones. Re-read candidates after taking locks.
  PERFORM 1 FROM appointment_reminders WHERE reminder_phone(patient_phone)=v_phone ORDER BY id FOR UPDATE;
  SELECT array_agg(r.id ORDER BY r.id) INTO candidates
  FROM appointment_reminders r JOIN clinic_appointments a ON a.id=r.appointment_id
  JOIN clinic_reminder_settings s ON s.clinic_id=a.clinic_id
  WHERE reminder_phone(r.patient_phone)=v_phone AND r.status='confirmed'
    AND a.outcome IS NULL AND a.disqualified_at IS NULL
    AND (a.appointment_date+a.appointment_time::time) AT TIME ZONE s.timezone>now()
    AND s.mode='confirmation' AND r.schedule_changed_at<=received_at
    AND EXISTS(SELECT 1 FROM appointment_reminder_deliveries d
      WHERE d.reminder_id=r.id AND d.revision=r.confirmation_revision
        AND d.kind IN ('request','followup') AND d.status IN ('sending','accepted','delivered','unknown')
        AND d.created_at<=received_at);
  IF NOT EXISTS(SELECT 1 FROM appointment_reminders r WHERE r.id=ANY(candidates)
      AND confirmation_reply_matches(r,p_from,p_to,received_at)) THEN
    -- STOP/START still applies to a known conversation even with no pending booking.
    IF NOT ((is_stop OR is_start) AND EXISTS(SELECT 1 FROM sms_messages m
      WHERE m.direction='outbound' AND reminder_phone(m.to_number)=v_phone
        AND reminder_phone(m.from_number)=reminder_phone(p_to)
        AND coalesce(m.sent_at,m.created_at)<=received_at)) THEN
      RETURN jsonb_build_object('matched',false);
    END IF;
    candidates:=NULL;
  END IF;
  -- Unmatched messages remain retryable if provider acceptance/inbox logging is late.
  INSERT INTO appointment_reply_receipts(provider_id) VALUES(p_sid) ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN RETURN jsonb_build_object('duplicate',true); END IF;
  IF (is_stop OR is_start) AND EXISTS(
    SELECT 1 FROM sms_messages newer JOIN appointment_reply_receipts receipt ON receipt.provider_id=newer.twilio_message_sid
    WHERE newer.direction='inbound' AND reminder_phone(newer.from_number)=v_phone AND newer.created_at>received_at
      AND lower(trim(newer.body)) IN ('stop','stopall','unsubscribe','cancel','end','quit','revoke','optout','start','unstop')
  ) THEN RETURN jsonb_build_object('matched',true,'stale',true); END IF;
  IF is_stop THEN
    INSERT INTO patient_sms_opt_outs(phone,created_at) VALUES(v_phone,received_at) ON CONFLICT DO NOTHING;
  ELSIF is_start THEN
    DELETE FROM patient_sms_opt_outs WHERE phone=v_phone;
    RETURN jsonb_build_object('opted_in',true);
  END IF;
  IF cardinality(candidates) IS NULL THEN RETURN jsonb_build_object('matched',false); END IF;

  -- Use the conversation as it stood when the reply arrived, not recovery time.
  -- A delivery's claim time handles a fast reply arriving before inbox logging.
  SELECT m.twilio_message_sid INTO latest_sid FROM sms_messages m
  LEFT JOIN appointment_reminder_deliveries d ON d.provider_id=m.twilio_message_sid
  WHERE m.direction='outbound' AND reminder_phone(m.to_number)=v_phone
    AND coalesce(d.created_at,m.sent_at,m.created_at)<=received_at
  ORDER BY coalesce(d.created_at,m.sent_at,m.created_at) DESC,m.id DESC LIMIT 1;
  yes_reply:=NOT is_stop AND message ~ '^(yes|y)[.![:space:]]*$' AND cardinality(candidates)=1
    AND EXISTS(SELECT 1 FROM appointment_reminder_deliveries d WHERE d.reminder_id=candidates[1]
      AND d.provider_id=latest_sid AND d.kind IN ('request','followup','ack')
      AND d.revision=(SELECT confirmation_revision FROM appointment_reminders WHERE id=candidates[1]))
    AND NOT EXISTS(SELECT 1 FROM patient_sms_opt_outs WHERE phone=v_phone)
    AND NOT EXISTS(SELECT 1 FROM sms_messages m
      LEFT JOIN appointment_reminder_deliveries d ON d.provider_id=m.twilio_message_sid
      WHERE m.direction='outbound' AND reminder_phone(m.to_number)=v_phone
        AND coalesce(d.created_at,m.sent_at,m.created_at)<=received_at
        AND coalesce(d.created_at,m.sent_at,m.created_at)=(
          SELECT max(coalesce(d2.created_at,m2.sent_at,m2.created_at)) FROM sms_messages m2
          LEFT JOIN appointment_reminder_deliveries d2 ON d2.provider_id=m2.twilio_message_sid
          WHERE m2.direction='outbound' AND reminder_phone(m2.to_number)=v_phone
            AND coalesce(d2.created_at,m2.sent_at,m2.created_at)<=received_at)
        AND NOT EXISTS(SELECT 1 FROM appointment_reminder_deliveries safe
          WHERE safe.provider_id=m.twilio_message_sid AND safe.reminder_id=candidates[1]
            AND safe.revision=(SELECT confirmation_revision FROM appointment_reminders WHERE id=candidates[1])
            AND safe.kind IN ('request','followup','ack')));
  FOREACH chosen IN ARRAY candidates LOOP
    -- Replaying an older reply must never overwrite a newer reply or staff call.
    IF EXISTS(SELECT 1 FROM appointment_reminders WHERE id=chosen AND
      (confirmation_last_reply_at>received_at OR confirmation_last_call_at>received_at)) THEN CONTINUE; END IF;
    IF cardinality(candidates)=1 AND message ~ '^(yes|y|ok|thanks|thank you|stop|stopall|unsubscribe|cancel|end|quit)[.![:space:]]*$'
      AND EXISTS(SELECT 1 FROM appointment_reminders WHERE id=chosen AND confirmation_state='confirmed') THEN
      UPDATE appointment_reminders SET confirmation_last_reply=left(p_body,2000),confirmation_last_reply_at=received_at WHERE id=chosen;
      CONTINUE;
    END IF;
    UPDATE appointment_reminders SET confirmation_last_reply=left(p_body,2000),confirmation_last_reply_at=received_at,
      confirmation_state=CASE WHEN yes_reply THEN 'confirmed' ELSE 'needs_call' END,
      confirmation_reason=CASE WHEN yes_reply THEN null WHEN is_stop THEN 'opt_out' ELSE 'patient_reply' END,
      confirmation_confirmed_at=CASE WHEN yes_reply THEN received_at ELSE null END,
      confirmation_method=CASE WHEN yes_reply THEN 'sms' ELSE null END,updated_at=now()
    WHERE id=chosen AND status='confirmed';
  END LOOP;
  RETURN jsonb_build_object('matched',true,'confirmed',yes_reply,'ambiguous',cardinality(candidates)>1);
END $$;

-- Durable recovery for a webhook interruption between inbox storage and matching.
-- Bounded, idempotent and restricted to current, upcoming confirmation bookings.
CREATE OR REPLACE FUNCTION public.reconcile_appointment_confirmation_replies(p_limit integer DEFAULT 500)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE m record; result jsonb; processed integer:=0; confirmed integer:=0;
BEGIN
  IF p_limit<1 OR p_limit>1000 OR p_limit IS NULL THEN RAISE EXCEPTION 'Reply limit must be between 1 and 1000'; END IF;
  FOR m IN
    SELECT incoming.* FROM sms_messages incoming
    WHERE incoming.direction='inbound' AND incoming.twilio_message_sid IS NOT NULL
      AND NOT EXISTS(SELECT 1 FROM appointment_reply_receipts WHERE provider_id=incoming.twilio_message_sid)
      AND EXISTS(SELECT 1 FROM appointment_reminders r JOIN clinic_appointments a ON a.id=r.appointment_id
        JOIN clinic_reminder_settings s ON s.clinic_id=a.clinic_id
        WHERE r.status='confirmed' AND a.outcome IS NULL AND a.disqualified_at IS NULL AND s.mode='confirmation'
          AND (a.appointment_date+a.appointment_time::time) AT TIME ZONE s.timezone>now()
          AND confirmation_reply_matches(r,incoming.from_number,incoming.to_number,incoming.created_at))
    ORDER BY incoming.created_at,incoming.id LIMIT p_limit
  LOOP
    result:=consume_appointment_confirmation_reply(m.twilio_message_sid,m.from_number,m.to_number,m.body,null);
    processed:=processed+1;
    IF result->>'confirmed'='true' THEN confirmed:=confirmed+1; END IF;
  END LOOP;
  RETURN jsonb_build_object('processed',processed,'confirmed',confirmed);
END $$;

CREATE INDEX IF NOT EXISTS sms_inbound_confirmation_phone_time
  ON public.sms_messages(public.reminder_phone(from_number),created_at)
  WHERE direction='inbound' AND twilio_message_sid IS NOT NULL;

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
  -- A received reply suppresses chasing even if its webhook/RPC failed. The
  -- worker reconciles it separately; claiming never sends a false no-reply alert.
  IF p_kind IN ('request','followup','call_email') AND EXISTS(
    SELECT 1 FROM sms_messages incoming WHERE incoming.direction='inbound'
      AND incoming.twilio_message_sid IS NOT NULL
      AND reminder_phone(incoming.from_number)=reminder_phone(r.patient_phone)
      AND confirmation_reply_matches(r,incoming.from_number,incoming.to_number,incoming.created_at)
  ) THEN RETURN null; END IF;
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

REVOKE ALL ON FUNCTION public.confirmation_reply_matches(public.appointment_reminders,text,text,timestamptz),
  public.consume_appointment_confirmation_reply(text,text,text,text,text),
  public.reconcile_appointment_confirmation_replies(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.confirmation_reply_matches(public.appointment_reminders,text,text,timestamptz),
  public.consume_appointment_confirmation_reply(text,text,text,text,text),
  public.reconcile_appointment_confirmation_replies(integer) TO service_role;
