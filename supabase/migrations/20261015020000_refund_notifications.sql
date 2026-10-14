-- Capture new refund transitions atomically. No historical notifications are backfilled.
ALTER TABLE public.clinic_appointments ADD COLUMN IF NOT EXISTS refund_error text;
ALTER TABLE public.clinic_appointments DROP CONSTRAINT IF EXISTS clinic_appointments_refund_status_check;
ALTER TABLE public.clinic_appointments ADD CONSTRAINT clinic_appointments_refund_status_check
  CHECK (refund_status IS NULL OR refund_status IN ('refunded','refunded_manual','failed','refund_pending','manual_required'));

CREATE TABLE IF NOT EXISTS public.refund_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('patient_sms','ops_email')),
  dedupe_key text NOT NULL UNIQUE,
  appointment_id uuid REFERENCES public.clinic_appointments(id) ON DELETE SET NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','checking','sending','accepted','delivered','failed','uncertain','cancelled')),
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  verification_next_at timestamptz NOT NULL DEFAULT now()+interval '6 hours',
  claim_token uuid,
  claimed_at timestamptz,
  sms_sid text UNIQUE,
  sms_body text,
  last_error text,
  inbox_logged boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS refund_notifications_due_idx ON public.refund_notifications(status,next_attempt_at);
ALTER TABLE public.refund_notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.refund_notifications FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.refund_notifications TO service_role;
GRANT SELECT ON public.refund_notifications TO authenticated;
DROP POLICY IF EXISTS refund_notifications_admin_read ON public.refund_notifications;
CREATE POLICY refund_notifications_admin_read ON public.refund_notifications FOR SELECT TO authenticated USING (public.is_admin_user());

CREATE OR REPLACE FUNCTION public.capture_refund_notification() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p jsonb; reference text; processor text; key text;
BEGIN
  IF NEW.refund_status IS NOT DISTINCT FROM OLD.refund_status
    AND NEW.square_refund_id IS NOT DISTINCT FROM OLD.square_refund_id
    AND NEW.stripe_refund_id IS NOT DISTINCT FROM OLD.stripe_refund_id THEN RETURN NEW; END IF;
  processor := CASE WHEN NEW.square_refund_id IS NOT NULL THEN 'square'
    WHEN NEW.stripe_refund_id IS NOT NULL THEN 'stripe' ELSE NEW.payment_processor END;
  reference := coalesce(NEW.square_refund_id,NEW.stripe_refund_id);
  p := jsonb_build_object('patient_name',NEW.patient_name,'patient_phone',NEW.patient_phone,
    'lead_id',NEW.lead_id,'clinic_name',(SELECT clinic_name FROM public.partner_clinics WHERE id=NEW.clinic_id),
    'amount',NEW.deposit_amount,'processor',processor,'payment_id',CASE WHEN processor='square' THEN NEW.square_payment_id ELSE NEW.stripe_payment_intent_id END,
    'refund_id',reference,'reason',NEW.refund_error);
  IF NEW.refund_status IN ('refund_pending','refunded') AND reference IS NOT NULL THEN
    key := 'refund:' || processor || ':' || reference;
    INSERT INTO public.refund_notifications(kind,dedupe_key,appointment_id,payload)
      VALUES('patient_sms',key,NEW.id,p) ON CONFLICT(dedupe_key) DO NOTHING;
  ELSIF NEW.refund_status='refunded_manual' AND OLD.refund_status IS DISTINCT FROM 'refunded_manual' THEN
    INSERT INTO public.refund_notifications(kind,dedupe_key,appointment_id,payload)
      VALUES('patient_sms','manual:'||NEW.id,NEW.id,p||jsonb_build_object('manual',true)) ON CONFLICT(dedupe_key) DO NOTHING;
  ELSIF NEW.refund_status IN ('failed','manual_required')
    AND coalesce(OLD.refund_status,'') NOT IN ('failed','manual_required') THEN
    INSERT INTO public.refund_notifications(kind,dedupe_key,appointment_id,payload)
      VALUES('ops_email','failure:'||NEW.id||':'||gen_random_uuid(),NEW.id,
        p||jsonb_build_object('category','refund','reason',coalesce(NEW.refund_error,
          CASE WHEN NEW.refund_status='manual_required' THEN 'The deposit needs a manual refund. No completed card refund is recorded.' ELSE 'The payment provider could not complete the refund.' END)));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS capture_refund_notification ON public.clinic_appointments;
CREATE TRIGGER capture_refund_notification AFTER UPDATE OF refund_status,square_refund_id,stripe_refund_id
  ON public.clinic_appointments FOR EACH ROW EXECUTE FUNCTION public.capture_refund_notification();
REVOKE ALL ON FUNCTION public.capture_refund_notification() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.flag_refund_notification(p_id uuid,p_category text,p_reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.refund_notifications(kind,dedupe_key,appointment_id,payload)
    SELECT 'ops_email','attention:'||id||':'||p_category,appointment_id,
      payload||jsonb_build_object('category',p_category,'reason',left(p_reason,1500))
    FROM public.refund_notifications WHERE id=p_id AND kind='patient_sms'
    ON CONFLICT(dedupe_key) DO NOTHING;
END $$;

CREATE OR REPLACE FUNCTION public.claim_refund_notification(p_id uuid) RETURNS SETOF public.refund_notifications
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.refund_notifications SET status='checking',claim_token=gen_random_uuid(),claimed_at=now(),attempts=attempts+1,updated_at=now()
    WHERE id=p_id AND ((status='pending' AND next_attempt_at<=now()) OR (status='checking' AND claimed_at<now()-interval '5 minutes'))
    RETURNING *;
$$;

-- Email enqueue and status update share one transaction: a crash cannot lose the alert or enqueue it twice.
CREATE OR REPLACE FUNCTION public.enqueue_refund_alert(p_id uuid,p_claim uuid,p_subject text,p_html text,p_text text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e public.refund_notifications;
BEGIN
  SELECT * INTO e FROM public.refund_notifications WHERE id=p_id FOR UPDATE;
  IF e.id IS NULL OR e.kind<>'ops_email' OR e.status<>'checking' OR e.claim_token IS DISTINCT FROM p_claim THEN RETURN false; END IF;
  IF EXISTS(SELECT 1 FROM public.suppressed_emails WHERE email='peter@gobold.com.au') THEN
    UPDATE public.refund_notifications SET status='failed',last_error='Owner email is suppressed; check email delivery settings',updated_at=now() WHERE id=p_id;
    RETURN false;
  END IF;
  PERFORM public.enqueue_email('refund_alert_emails',jsonb_build_object(
    'message_id',e.id,'to','peter@gobold.com.au',
    'from','Hair Transplant Group <noreply@notify.hairtransplantgroup.com.au>',
    'sender_domain','notify.hairtransplantgroup.com.au','subject',p_subject,'html',p_html,'text',p_text,
    'purpose','transactional','label','refund-alert','idempotency_key','refund-alert-'||e.id,'queued_at',now()));
  INSERT INTO public.email_send_log(message_id,template_name,recipient_email,status)
    VALUES(e.id,'refund-alert','peter@gobold.com.au','pending');
  UPDATE public.refund_notifications SET status='accepted',updated_at=now(),last_error=NULL WHERE id=p_id;
  RETURN true;
END $$;

-- Signed callbacks can arrive before the send request returns. Keep terminal outcomes monotonic.
CREATE OR REPLACE FUNCTION public.record_refund_sms_status(p_id uuid,p_sid text,p_status text,p_error text DEFAULT NULL) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e public.refund_notifications; target text;
BEGIN
  IF p_sid IS NULL OR p_sid !~ '^SM[0-9a-fA-F]{32}$' THEN RETURN false; END IF;
  SELECT * INTO e FROM public.refund_notifications WHERE id=p_id AND kind='patient_sms' FOR UPDATE;
  IF e.id IS NULL OR (e.sms_sid IS NOT NULL AND e.sms_sid<>p_sid)
    OR e.status NOT IN ('sending','accepted','uncertain','delivered','failed') THEN RETURN false; END IF;
  target := CASE WHEN p_status IN ('delivered','read') THEN 'delivered'
    WHEN p_status IN ('failed','undelivered','canceled') THEN 'failed'
    WHEN p_status IN ('accepted','queued','sending','sent') THEN 'accepted' ELSE NULL END;
  IF target IS NULL THEN RETURN false; END IF;
  IF e.status='delivered' OR (e.status='failed' AND target='accepted') THEN RETURN true; END IF;
  UPDATE public.refund_notifications SET status=target,sms_sid=p_sid,
    last_error=CASE WHEN target='failed' THEN coalesce(p_error,'Twilio reported '||p_status) ELSE NULL END,updated_at=now()
    WHERE id=p_id;
  UPDATE public.sms_messages SET status=CASE WHEN target='accepted' THEN p_status ELSE target END
    WHERE twilio_message_sid=p_sid;
  IF target='failed' THEN PERFORM public.flag_refund_notification(p_id,'sms',coalesce(p_error,'Twilio reported '||p_status)); END IF;
  RETURN true;
END $$;

-- Inbox logging shares the callback row lock, so a concurrent callback cannot be overwritten.
CREATE OR REPLACE FUNCTION public.log_refund_sms(p_id uuid,p_from text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e public.refund_notifications; v_phone text; thread uuid;
BEGIN
  SELECT * INTO e FROM public.refund_notifications WHERE id=p_id FOR UPDATE;
  IF e.id IS NULL OR e.sms_sid IS NULL OR e.sms_body IS NULL OR e.inbox_logged THEN RETURN; END IF;
  v_phone := regexp_replace(coalesce(e.payload->>'patient_phone',''),'[^0-9+]','','g');
  IF v_phone ~ '^0[0-9]{9}$' THEN v_phone := '+61'||substring(v_phone from 2);
  ELSIF v_phone ~ '^61[0-9]{9}$' THEN v_phone := '+'||v_phone; END IF;
  IF v_phone !~ '^\+[1-9][0-9]{7,14}$' THEN RAISE EXCEPTION 'Invalid refund SMS destination'; END IF;
  INSERT INTO public.sms_threads(phone,display_name) VALUES(v_phone,e.payload->>'patient_name') ON CONFLICT(phone) DO NOTHING;
  SELECT id INTO thread FROM public.sms_threads WHERE sms_threads.phone=v_phone;
  INSERT INTO public.sms_messages(thread_id,direction,body,twilio_message_sid,status,from_number,to_number,lead_id,sent_at)
    VALUES(thread,'outbound',e.sms_body,e.sms_sid,CASE WHEN e.status='accepted' THEN 'queued' ELSE e.status END,
      p_from,v_phone,(e.payload->>'lead_id')::uuid,coalesce(e.claimed_at,e.created_at))
    ON CONFLICT(twilio_message_sid) DO NOTHING;
  UPDATE public.refund_notifications SET inbox_logged=true WHERE id=p_id;
END $$;

CREATE OR REPLACE FUNCTION public.recover_refund_notifications() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e record;
BEGIN
  -- Never resend an SMS whose HTTP response was lost. It might have been delivered.
  FOR e IN UPDATE public.refund_notifications SET status='uncertain',
    last_error='Sending was interrupted. Check Twilio history before any resend.',updated_at=now()
    WHERE kind='patient_sms' AND status='sending' AND claimed_at<now()-interval '5 minutes' RETURNING id,last_error
  LOOP PERFORM public.flag_refund_notification(e.id,'sms',e.last_error); END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.flag_refund_notification(uuid,text,text),public.claim_refund_notification(uuid),
  public.enqueue_refund_alert(uuid,uuid,text,text,text),public.record_refund_sms_status(uuid,text,text,text),public.recover_refund_notifications()
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.flag_refund_notification(uuid,text,text),public.claim_refund_notification(uuid),
  public.enqueue_refund_alert(uuid,uuid,text,text,text),public.record_refund_sms_status(uuid,text,text,text),public.recover_refund_notifications()
  TO service_role;
REVOKE ALL ON FUNCTION public.log_refund_sms(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.log_refund_sms(uuid,text) TO service_role;

-- Deployment scheduling (omitted by the local SQL test harness).
SELECT cron.schedule('refund-notifications-every-minute','* * * * *',
  $job$SELECT net.http_post(
    url := 'https://hairtransplantgroup.lovable.app/api/public/hooks/refund-notifications',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name IN ('SUPABASE_SERVICE_ROLE_KEY','email_queue_service_role_key')
        ORDER BY CASE name WHEN 'SUPABASE_SERVICE_ROLE_KEY' THEN 0 ELSE 1 END LIMIT 1)),
    body := '{}'::jsonb, timeout_milliseconds := 55000
  );$job$);

SELECT cron.schedule('refund-alert-emails-every-minute','* * * * *',
  $job$SELECT net.http_post(
    url := 'https://hairtransplantgroup.lovable.app/lovable/email/queue/process',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name IN ('SUPABASE_SERVICE_ROLE_KEY','email_queue_service_role_key')
        ORDER BY CASE name WHEN 'SUPABASE_SERVICE_ROLE_KEY' THEN 0 ELSE 1 END LIMIT 1)),
    body := '{"refundAlertsOnly":true}'::jsonb, timeout_milliseconds := 55000
  );$job$);
