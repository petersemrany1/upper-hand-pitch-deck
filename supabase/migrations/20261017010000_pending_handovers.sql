-- A reservation/payment is not proof that the clinic handover was sent.
CREATE OR REPLACE VIEW public.pending_clinic_handovers AS
SELECT a.id AS appointment_id, m.id AS lead_id, a.patient_name,
  coalesce(a.booking_rep_id,m.rep_id) AS rep_id,
  coalesce(r.name,'Unassigned') AS rep_name, coalesce(c.clinic_name,'Clinic') AS clinic_name,
  a.appointment_date, a.appointment_time,
  greatest(a.created_at,m.deposit_paid_at) AS pending_since
FROM public.clinic_appointments a
JOIN public.meta_leads m ON m.id=a.lead_id
LEFT JOIN public.sales_reps r ON r.id=coalesce(a.booking_rep_id,m.rep_id)
LEFT JOIN public.partner_clinics c ON c.id=a.clinic_id
WHERE m.deposit_paid_at IS NOT NULL AND m.handover_sent_at IS NULL
  AND a.appointment_date >= (now() AT TIME ZONE 'Australia/Sydney')::date
  AND a.outcome IS NULL AND a.disqualified_at IS NULL
  AND coalesce(a.refund_status,'') NOT IN ('refund_pending','refunded','refunded_manual');
REVOKE ALL ON public.pending_clinic_handovers FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.pending_clinic_handovers TO service_role;

-- Only the authenticated server resolves p_rep. No caller-supplied rep identity.
CREATE OR REPLACE FUNCTION public.end_session_after_handovers(p_rep uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE pending jsonb;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_rep::text,0));
  SELECT jsonb_agg(jsonb_build_object('lead_id',lead_id,'patient_name',patient_name,
    'clinic_name',clinic_name,'appointment_date',appointment_date,'appointment_time',appointment_time)
    ORDER BY pending_since) INTO pending FROM public.pending_clinic_handovers WHERE rep_id=p_rep;
  IF pending IS NOT NULL THEN RETURN jsonb_build_object('ok',false,'pending',pending); END IF;
  PERFORM public.rep_invoice_session_action(p_rep,'end');
  RETURN jsonb_build_object('ok',true);
END $$;
REVOKE ALL ON FUNCTION public.end_session_after_handovers(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.end_session_after_handovers(uuid) TO service_role;

CREATE TABLE IF NOT EXISTS public.handover_alerts (
  appointment_id uuid PRIMARY KEY REFERENCES public.clinic_appointments(id) ON DELETE CASCADE,
  message_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  status text NOT NULL CHECK(status IN ('queued','blocked')),
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.handover_alerts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.handover_alerts FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.handover_alerts TO service_role;
GRANT SELECT ON public.handover_alerts TO authenticated;
DROP POLICY IF EXISTS handover_alerts_admin_read ON public.handover_alerts;
CREATE POLICY handover_alerts_admin_read ON public.handover_alerts FOR SELECT TO authenticated USING(public.is_admin_user());

DO $$ BEGIN
  IF to_regclass('pgmq.q_handover_alert_emails') IS NULL THEN PERFORM pgmq.create('handover_alert_emails'); END IF;
  IF to_regclass('pgmq.q_handover_alert_emails_dlq') IS NULL THEN PERFORM pgmq.create('handover_alert_emails_dlq'); END IF;
END $$;

-- Runs in PostgreSQL even when every browser is closed. Enqueue and duplicate
-- protection commit together; no payment, booking or clinic email is modified.
CREATE OR REPLACE FUNCTION public.enqueue_overdue_handovers() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p record; notice uuid; token_value text; body_text text; reason text; queued integer:=0;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('overdue-clinic-handovers',0));
  FOR p IN SELECT h.* FROM public.pending_clinic_handovers h
    LEFT JOIN public.handover_alerts a ON a.appointment_id=h.appointment_id
    WHERE h.pending_since <= now()-interval '45 minutes' AND (a.appointment_id IS NULL OR a.status='blocked')
    ORDER BY h.pending_since LIMIT 100
  LOOP
    reason:=NULL;
    IF EXISTS(SELECT 1 FROM public.suppressed_emails WHERE lower(email)='peter@gobold.com.au') THEN
      reason:='Owner email is suppressed';
    END IF;
    INSERT INTO public.email_unsubscribe_tokens(token,email)
      VALUES(replace(gen_random_uuid()::text||gen_random_uuid()::text,'-',''),'peter@gobold.com.au')
      ON CONFLICT(email) DO NOTHING;
    SELECT token INTO token_value FROM public.email_unsubscribe_tokens WHERE email='peter@gobold.com.au' AND used_at IS NULL;
    IF token_value IS NULL THEN reason:='Owner email unsubscribe token is used'; END IF;
    INSERT INTO public.handover_alerts(appointment_id,status,last_error)
      VALUES(p.appointment_id,CASE WHEN reason IS NULL THEN 'queued' ELSE 'blocked' END,reason)
      ON CONFLICT(appointment_id) DO UPDATE SET status=excluded.status,last_error=excluded.last_error
      RETURNING message_id INTO notice;
    IF reason IS NOT NULL THEN CONTINUE; END IF;
    body_text:=format(E'%s has paid and has a saved booking, but the clinic handover has not been sent after 45 minutes.\n\nSales rep: %s\nClinic: %s\nAppointment: %s at %s\n\nOpen the booking and complete the clinic handover.\nhttps://hairtransplantgroup.lovable.app/booked-appointments',
      p.patient_name,p.rep_name,p.clinic_name,to_char(p.appointment_date,'DD Mon YYYY'),p.appointment_time);
    PERFORM public.enqueue_email('handover_alert_emails',jsonb_build_object(
      'message_id',notice,'to','peter@gobold.com.au',
      'from','Hair Transplant Group <noreply@notify.hairtransplantgroup.com.au>',
      'sender_domain','notify.hairtransplantgroup.com.au',
      'subject','ACTION NEEDED: '||p.patient_name||' — clinic handover missing',
      'text',body_text,'html','<div style="font-family:Arial,sans-serif;white-space:pre-wrap">'||
        replace(replace(replace(body_text,'&','&amp;'),'<','&lt;'),'>','&gt;')||'</div>',
      'purpose','transactional','label','handover-overdue','idempotency_key','handover-overdue-'||notice,
      'unsubscribe_token',token_value,'queued_at',now(),'handover_appointment_id',p.appointment_id));
    INSERT INTO public.email_send_log(message_id,template_name,recipient_email,status)
      VALUES(notice,'handover-overdue','peter@gobold.com.au','pending');
    queued:=queued+1;
  END LOOP;
  RETURN queued;
END $$;
REVOKE ALL ON FUNCTION public.enqueue_overdue_handovers() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_overdue_handovers() TO service_role;

-- Renew only a provider-confirmed failed run. Never renew uncertain/timeout sends.
CREATE OR REPLACE FUNCTION public.renew_failed_handover_email(p_message_id bigint,p_previous_key text,p_next_key text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE changed integer;
BEGIN
  IF p_previous_key IS NULL OR p_next_key IS NULL OR p_previous_key=p_next_key OR length(p_next_key)>200 THEN RETURN false; END IF;
  UPDATE pgmq.q_handover_alert_emails q SET message=jsonb_set(q.message,'{idempotency_key}',to_jsonb(p_next_key))
    WHERE q.msg_id=p_message_id AND q.message->>'idempotency_key'=p_previous_key
      AND q.message->>'label'='handover-overdue' AND q.message->>'to'='peter@gobold.com.au'
      AND NOT EXISTS(SELECT 1 FROM public.email_send_log l WHERE l.message_id::text=q.message->>'message_id' AND l.status='sent');
  GET DIAGNOSTICS changed=ROW_COUNT;
  RETURN changed=1;
END $$;
REVOKE ALL ON FUNCTION public.renew_failed_handover_email(bigint,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.renew_failed_handover_email(bigint,text,text) TO service_role;

-- Deployment scheduling: activate after the dispatcher code is published.
SELECT cron.schedule('handover-alerts-every-minute','* * * * *',
  $job$SELECT public.enqueue_overdue_handovers();
  SELECT net.http_post(
    url := 'https://hairtransplantgroup.lovable.app/lovable/email/queue/process',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name IN ('SUPABASE_SERVICE_ROLE_KEY','email_queue_service_role_key')
        ORDER BY CASE name WHEN 'SUPABASE_SERVICE_ROLE_KEY' THEN 0 ELSE 1 END LIMIT 1)),
    body := '{"handoverAlertsOnly":true}'::jsonb,timeout_milliseconds := 55000
  );$job$);
