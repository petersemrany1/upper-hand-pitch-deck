-- Requests are separate from attendance, classification, payments and pack counts.
CREATE TABLE IF NOT EXISTS public.clinic_reclassification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL UNIQUE REFERENCES public.clinic_appointments(id) ON DELETE CASCADE,
  clinic_id uuid NOT NULL REFERENCES public.partner_clinics(id),
  requested_by uuid NOT NULL,
  requester_email text NOT NULL,
  patient_name text NOT NULL,
  clinic_name text NOT NULL,
  appointment_date date NOT NULL,
  appointment_time text,
  outcome_at_request text,
  reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 20 AND 4000),
  acknowledgement_version text NOT NULL DEFAULT '2026-10-17-v1',
  acknowledged_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status='pending'),
  email_state text NOT NULL DEFAULT 'pending' CHECK (email_state IN ('pending','queued','blocked')),
  email_error text,
  email_message_id uuid NOT NULL DEFAULT gen_random_uuid()
);
ALTER TABLE public.clinic_reclassification_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.clinic_reclassification_requests FROM anon,authenticated;
GRANT SELECT ON public.clinic_reclassification_requests TO authenticated;
GRANT ALL ON public.clinic_reclassification_requests TO service_role;
DROP POLICY IF EXISTS reclassification_read ON public.clinic_reclassification_requests;
CREATE POLICY reclassification_read ON public.clinic_reclassification_requests FOR SELECT TO authenticated
USING (public.is_admin_user() OR (public.is_clinic_user_for(clinic_id) AND EXISTS (
  SELECT 1 FROM public.clinic_appointments a WHERE a.id=appointment_id AND a.clinic_id=clinic_reclassification_requests.clinic_id
)));

CREATE OR REPLACE FUNCTION public.submit_clinic_reclassification(p_appointment_id uuid,p_reason text,p_acknowledged boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.clinic_appointments%ROWTYPE; r public.clinic_reclassification_requests%ROWTYPE; c text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to submit a request'; END IF;
  SELECT * INTO a FROM public.clinic_appointments WHERE id=p_appointment_id FOR UPDATE;
  IF NOT FOUND OR NOT (coalesce(public.is_admin_user(),false) OR coalesce(public.is_clinic_user_for(a.clinic_id),false)) THEN
    RAISE EXCEPTION 'This patient card is unavailable';
  END IF;
  IF p_acknowledged IS DISTINCT FROM true OR p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 20 AND 4000 THEN
    RAISE EXCEPTION 'Explain the criterion and supporting details (20–4000 characters), and acknowledge the review terms';
  END IF;
  SELECT * INTO r FROM public.clinic_reclassification_requests WHERE appointment_id=a.id;
  IF NOT FOUND THEN
    IF a.outcome='disqualified' OR a.disqualified_at IS NOT NULL THEN RAISE EXCEPTION 'This lead is already disqualified'; END IF;
    SELECT clinic_name INTO c FROM public.partner_clinics WHERE id=a.clinic_id;
    INSERT INTO public.clinic_reclassification_requests(appointment_id,clinic_id,requested_by,requester_email,patient_name,clinic_name,appointment_date,appointment_time,outcome_at_request,reason)
    VALUES(a.id,a.clinic_id,auth.uid(),coalesce(auth.jwt()->>'email','Account '||auth.uid()::text),a.patient_name,c,a.appointment_date,a.appointment_time,a.outcome,btrim(p_reason)) RETURNING * INTO r;
  ELSIF r.clinic_id<>a.clinic_id AND NOT coalesce(public.is_admin_user(),false) THEN
    RAISE EXCEPTION 'An existing request belongs to the previous clinic. Please contact Admin';
  END IF;
  RETURN jsonb_build_object('id',r.id,'appointment_id',r.appointment_id,'created_at',r.created_at,'reason',r.reason,'status',r.status);
END $$;
REVOKE ALL ON FUNCTION public.submit_clinic_reclassification(uuid,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_clinic_reclassification(uuid,text,boolean) TO authenticated;

DO $$ BEGIN
  IF to_regclass('pgmq.q_reclassification_alert_emails') IS NULL THEN PERFORM pgmq.create('reclassification_alert_emails'); END IF;
  IF to_regclass('pgmq.q_reclassification_alert_emails_dlq') IS NULL THEN PERFORM pgmq.create('reclassification_alert_emails_dlq'); END IF;
END $$;

CREATE OR REPLACE FUNCTION public.enqueue_reclassification_emails() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.clinic_reclassification_requests%ROWTYPE; token_value text; body_text text; card_url text; queued integer:=0;
BEGIN
  -- Retain submissions during suppression; retry when the recipient is available.
  IF EXISTS(SELECT 1 FROM public.suppressed_emails WHERE email='peter@gobold.com.au')
    OR EXISTS(SELECT 1 FROM public.email_unsubscribe_tokens WHERE email='peter@gobold.com.au' AND used_at IS NOT NULL) THEN
    UPDATE public.clinic_reclassification_requests SET email_state='blocked',email_error='Owner recipient is suppressed' WHERE email_state IN ('pending','blocked');
    RETURN 0;
  END IF;
  INSERT INTO public.email_unsubscribe_tokens(email,token) VALUES('peter@gobold.com.au',gen_random_uuid()::text) ON CONFLICT(email) DO NOTHING;
  SELECT token INTO token_value FROM public.email_unsubscribe_tokens WHERE email='peter@gobold.com.au' AND used_at IS NULL;
  IF token_value IS NULL THEN RETURN 0; END IF;
  FOR r IN SELECT * FROM public.clinic_reclassification_requests WHERE email_state IN ('pending','blocked') ORDER BY created_at LIMIT 50 FOR UPDATE SKIP LOCKED LOOP
    card_url:='https://hairtransplantgroup.lovable.app/clinic-portal?viewClinic='||r.clinic_id||'&appointmentId='||r.appointment_id;
    body_text:=format(E'A lead reclassification request has been submitted. No classification, pack count, credit or refund has been changed.\n\nPatient: %s\nClinic: %s\nRequested by: %s\nConsultation: %s at %s\nSubmitted: %s (Sydney)\nClassification at submission: %s\n\nReason and supporting details:\n%s\n\nThe requester acknowledged a 1–2 week review timeframe and that the existing classification and pack count remain unchanged unless approved.\n\nOpen patient card: %s\nRequest reference: %s',
      r.patient_name,r.clinic_name,r.requester_email,r.appointment_date,r.appointment_time,to_char(r.created_at AT TIME ZONE 'Australia/Sydney','DD Mon YYYY HH24:MI'),coalesce(r.outcome_at_request,'Not yet recorded'),r.reason,card_url,r.id);
    PERFORM public.enqueue_email('reclassification_alert_emails',jsonb_build_object(
      'message_id',r.email_message_id,'to','peter@gobold.com.au',
      'from','Hair Transplant Group <noreply@notify.hairtransplantgroup.com.au>','sender_domain','notify.hairtransplantgroup.com.au',
      'subject','Reclassification requested: '||replace(replace(r.patient_name,E'\n',' '),E'\r',' '),
      'text',body_text,'html','<div style="font-family:Arial,sans-serif;white-space:pre-wrap">'||replace(replace(replace(body_text,'&','&amp;'),'<','&lt;'),'>','&gt;')||'</div><p><a href="'||replace(card_url,'&','&amp;')||'">Open patient card</a></p>',
      'purpose','transactional','label','reclassification-request','idempotency_key','reclassification-request-'||r.email_message_id,
      'unsubscribe_token',token_value,'queued_at',now(),'reclassification_request_id',r.id));
    INSERT INTO public.email_send_log(message_id,template_name,recipient_email,status) VALUES(r.email_message_id,'reclassification-request','peter@gobold.com.au','pending');
    UPDATE public.clinic_reclassification_requests SET email_state='queued',email_error=NULL WHERE id=r.id;
    queued:=queued+1;
  END LOOP;
  RETURN queued;
END $$;
REVOKE ALL ON FUNCTION public.enqueue_reclassification_emails() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_reclassification_emails() TO service_role;

CREATE OR REPLACE FUNCTION public.renew_failed_reclassification_email(p_message_id bigint,p_previous_key text,p_next_key text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE changed integer;
BEGIN
  IF p_previous_key IS NULL OR p_next_key IS NULL OR p_previous_key=p_next_key OR length(p_next_key)>200 THEN RETURN false; END IF;
  UPDATE pgmq.q_reclassification_alert_emails q SET message=jsonb_set(q.message,'{idempotency_key}',to_jsonb(p_next_key))
    WHERE q.msg_id=p_message_id AND q.message->>'idempotency_key'=p_previous_key
    AND q.message->>'label'='reclassification-request' AND q.message->>'to'='peter@gobold.com.au'
    AND NOT EXISTS(SELECT 1 FROM public.email_send_log l WHERE l.message_id::text=q.message->>'message_id' AND l.status='sent');
  GET DIAGNOSTICS changed=ROW_COUNT;
  RETURN changed=1;
END $$;
REVOKE ALL ON FUNCTION public.renew_failed_reclassification_email(bigint,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.renew_failed_reclassification_email(bigint,text,text) TO service_role;

-- Deployment scheduling: activate after the dispatcher code is published.
SELECT cron.schedule('reclassification-alerts-every-minute','* * * * *',
  $job$SELECT public.enqueue_reclassification_emails();
  SELECT net.http_post(url := 'https://hairtransplantgroup.lovable.app/lovable/email/queue/process',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name IN ('SUPABASE_SERVICE_ROLE_KEY','email_queue_service_role_key') ORDER BY CASE name WHEN 'SUPABASE_SERVICE_ROLE_KEY' THEN 0 ELSE 1 END LIMIT 1)),
    body := '{"reclassificationAlertsOnly":true}'::jsonb,timeout_milliseconds := 55000);$job$);
