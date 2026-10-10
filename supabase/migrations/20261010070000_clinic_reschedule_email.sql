-- Add a durable, reviewed clinic email to each new reschedule. Historical rows
-- stay NULL: deploying this must never notify clinics about old reschedules.
BEGIN;
ALTER TABLE public.appointment_reschedules
 ADD COLUMN IF NOT EXISTS email_to text,
 ADD COLUMN IF NOT EXISTS email_subject text,
 ADD COLUMN IF NOT EXISTS email_body text,
 ADD COLUMN IF NOT EXISTS email_status text CHECK (email_status IN ('pending','sending','accepted','failed','uncertain')),
 ADD COLUMN IF NOT EXISTS email_error text,
 ADD COLUMN IF NOT EXISTS email_receipt text,
 ADD COLUMN IF NOT EXISTS email_attempt_at timestamptz,
 ADD COLUMN IF NOT EXISTS email_accepted_at timestamptz;

-- Keep the existing booking transaction and SMS unchanged. If the clinic
-- address changed after review, the entire operation rolls back for re-review.
CREATE OR REPLACE FUNCTION public.commit_booking_reschedule_email(
 p_id uuid,p_request uuid,p_actor uuid,p_version text,p_date date,p_time text,p_reason text,p_sms text,p_phone text,
 p_email_subject text,p_email_body text,p_expected_email text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE event_id uuid; recipient text; previous public.appointment_reschedules;
BEGIN
 IF p_email_subject IS NULL OR length(btrim(p_email_subject)) NOT BETWEEN 1 AND 200 OR p_email_subject ~ E'[\r\n]'
    OR p_email_body IS NULL OR length(btrim(p_email_body)) NOT BETWEEN 1 AND 5000 THEN
   RAISE EXCEPTION 'Enter a valid clinic email subject and message';
 END IF;
 event_id:=public.commit_booking_reschedule(p_id,p_request,p_actor,p_version,p_date,p_time,p_reason,p_sms,p_phone);
 SELECT * INTO previous FROM public.appointment_reschedules WHERE id=event_id FOR UPDATE;
 IF previous.email_status IS NOT NULL THEN
   IF previous.email_subject IS DISTINCT FROM btrim(p_email_subject) OR previous.email_body IS DISTINCT FROM btrim(p_email_body)
      OR previous.email_to IS DISTINCT FROM btrim(p_expected_email) THEN RAISE EXCEPTION 'Request already used with different email details'; END IF;
   RETURN event_id;
 END IF;
 SELECT btrim(c.email) INTO recipient FROM public.partner_clinics c JOIN public.clinic_appointments a ON a.clinic_id=c.id WHERE a.id=p_id FOR SHARE OF c;
 IF recipient IS NULL OR recipient !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RAISE EXCEPTION 'Add a valid email address in the clinic settings before rescheduling'; END IF;
 IF recipient IS DISTINCT FROM btrim(p_expected_email) THEN RAISE EXCEPTION 'The clinic email address changed. Refresh and review the email again.'; END IF;
 UPDATE public.appointment_reschedules SET email_to=recipient,email_subject=btrim(p_email_subject),email_body=btrim(p_email_body),email_status='pending' WHERE id=event_id;
 RETURN event_id;
END $$;
REVOKE ALL ON FUNCTION public.commit_booking_reschedule_email(uuid,uuid,uuid,text,date,text,text,text,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.commit_booking_reschedule_email(uuid,uuid,uuid,text,date,text,text,text,text,text,text,text) TO service_role;

-- Claims serialize with a reschedule. Retry only explicit failures; a timeout
-- or lost receipt stays claimed/uncertain so it cannot send duplicate emails.
CREATE OR REPLACE FUNCTION public.claim_reschedule_email(p_event uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE e public.appointment_reschedules; a public.clinic_appointments;
BEGIN
 SELECT a0.* INTO a FROM public.clinic_appointments a0 JOIN public.appointment_reschedules e0 ON e0.appointment_id=a0.id WHERE e0.id=p_event;
 IF NOT FOUND THEN RAISE EXCEPTION 'Appointment not found'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(a.clinic_id::text,0));
 SELECT * INTO a FROM public.clinic_appointments WHERE id=a.id FOR UPDATE;
 SELECT * INTO e FROM public.appointment_reschedules WHERE id=p_event FOR UPDATE;
 IF e.email_status IS NULL OR e.email_status NOT IN ('pending','failed') THEN RETURN NULL; END IF;
 IF a.appointment_date<>e.new_date OR a.appointment_time::time<>e.new_time::time OR a.outcome IS NOT NULL OR a.disqualified_at IS NOT NULL
    OR NOT EXISTS(SELECT 1 FROM public.appointment_reminders r WHERE r.appointment_id=a.id AND r.status='confirmed') THEN
   RAISE EXCEPTION 'The appointment has changed again. Do not send the old clinic email.';
 END IF;
 UPDATE public.appointment_reschedules SET email_status='sending',email_error=NULL,email_attempt_at=now() WHERE id=p_event RETURNING * INTO e;
 RETURN to_jsonb(e);
END $$;
REVOKE ALL ON FUNCTION public.claim_reschedule_email(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_reschedule_email(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.customer_journey(p_lead uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=public AS $$
DECLARE phone_key text; related uuid[]; threads uuid[];
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.booking_sales_actor()) THEN RAISE EXCEPTION 'Sales access required'; END IF;
  SELECT public.sales_journey_phone(phone) INTO phone_key FROM public.meta_leads WHERE id=p_lead;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lead not found'; END IF;
  SELECT array_agg(id) INTO related FROM public.meta_leads WHERE id=p_lead OR (phone_key IS NOT NULL AND public.sales_journey_phone(phone)=phone_key);
  SELECT coalesce(array_agg(id),'{}'::uuid[]) INTO threads FROM public.sms_threads WHERE phone_key IS NOT NULL AND public.sales_journey_phone(phone)=phone_key;
  RETURN jsonb_build_object(
    'leadIds',to_jsonb(related), 'threadIds',to_jsonb(threads), 'phoneKey',phone_key,
    'calls',coalesce((SELECT jsonb_agg(x ORDER BY x.called_at DESC,x.id) FROM (
      SELECT c.id,c.called_at,c.direction,c.status,coalesce(c.duration,c.duration_seconds) AS duration,c.outcome,c.call_analysis,s.name AS rep_name
      FROM public.call_records c LEFT JOIN public.sales_reps s ON s.id=c.rep_id
      WHERE c.lead_id=ANY(related) OR (phone_key IS NOT NULL AND c.clinic_id IS NULL AND public.sales_journey_phone(c.phone)=phone_key)
    ) x),'[]'::jsonb),
    'messages',coalesce((SELECT jsonb_agg(x ORDER BY x.created_at DESC,x.id) FROM (
      SELECT m.id,m.created_at,m.sent_at,m.direction,m.body,m.media_urls,m.status,m.twilio_message_sid
      FROM public.sms_messages m
      WHERE m.lead_id=ANY(related) OR m.thread_id=ANY(threads)
        OR (phone_key IS NOT NULL AND public.sales_journey_phone(coalesce(nullif(m.phone,''),CASE WHEN m.direction='inbound' THEN m.from_number ELSE m.to_number END))=phone_key)
    ) x),'[]'::jsonb),
    'emails',coalesce((SELECT jsonb_agg(x ORDER BY x.created_at DESC,x.id) FROM (
      SELECT e.id,e.created_at,e.email_accepted_at,e.email_to,e.email_subject,e.email_body,e.email_status,e.email_error
      FROM public.appointment_reschedules e JOIN public.clinic_appointments a ON a.id=e.appointment_id
      WHERE a.lead_id=ANY(related) AND e.email_status IS NOT NULL
    ) x),'[]'::jsonb),
    'skips',coalesce((SELECT jsonb_agg(e ORDER BY e.created_at DESC,e.id) FROM public.lead_skip_events e WHERE e.lead_id=ANY(related)),'[]'::jsonb)
  );
END $$;
REVOKE ALL ON FUNCTION public.customer_journey(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.customer_journey(uuid) TO authenticated;


COMMIT;
