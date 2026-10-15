-- The email provider requires a stored unsubscribe token for every transactional email.
-- Reuse the existing owner's token and honour both suppression and previously used tokens.
CREATE OR REPLACE FUNCTION public.enqueue_refund_alert(p_id uuid,p_claim uuid,p_subject text,p_html text,p_text text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e public.refund_notifications; v_token text;
BEGIN
  SELECT * INTO e FROM public.refund_notifications WHERE id=p_id FOR UPDATE;
  IF e.id IS NULL OR e.kind<>'ops_email' OR e.status<>'checking' OR e.claim_token IS DISTINCT FROM p_claim THEN RETURN false; END IF;
  IF EXISTS(SELECT 1 FROM public.suppressed_emails WHERE email='peter@gobold.com.au') THEN
    UPDATE public.refund_notifications SET status='failed',last_error='Owner email is suppressed; check email delivery settings',updated_at=now() WHERE id=p_id;
    RETURN false;
  END IF;
  INSERT INTO public.email_unsubscribe_tokens(token,email)
    VALUES(replace(gen_random_uuid()::text||gen_random_uuid()::text,'-',''),'peter@gobold.com.au')
    ON CONFLICT(email) DO NOTHING;
  SELECT token INTO v_token FROM public.email_unsubscribe_tokens WHERE email='peter@gobold.com.au' AND used_at IS NULL;
  IF v_token IS NULL THEN
    UPDATE public.refund_notifications SET status='failed',last_error='Owner unsubscribe token is already used; check email delivery settings',updated_at=now() WHERE id=p_id;
    RETURN false;
  END IF;
  PERFORM public.enqueue_email('refund_alert_emails',jsonb_build_object(
    'message_id',e.id,'to','peter@gobold.com.au',
    'from','Hair Transplant Group <noreply@notify.hairtransplantgroup.com.au>',
    'sender_domain','notify.hairtransplantgroup.com.au','subject',p_subject,'html',p_html,'text',p_text,
    'purpose','transactional','label','refund-alert','idempotency_key','refund-alert-'||e.id,
    'unsubscribe_token',v_token,'queued_at',now()));
  INSERT INTO public.email_send_log(message_id,template_name,recipient_email,status)
    VALUES(e.id,'refund-alert','peter@gobold.com.au','pending');
  UPDATE public.refund_notifications SET status='accepted',updated_at=now(),last_error=NULL WHERE id=p_id;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.enqueue_refund_alert(uuid,uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_refund_alert(uuid,uuid,text,text,text) TO service_role;

-- Repair only unsent refund-alert queue entries. Keep their IDs and retry history.
DO $$ BEGIN
  IF to_regclass('pgmq.q_refund_alert_emails') IS NOT NULL THEN
    INSERT INTO public.email_unsubscribe_tokens(token,email)
      VALUES(replace(gen_random_uuid()::text||gen_random_uuid()::text,'-',''),'peter@gobold.com.au')
      ON CONFLICT(email) DO NOTHING;
    UPDATE pgmq.q_refund_alert_emails q SET message=q.message||jsonb_build_object('unsubscribe_token',t.token)
      FROM public.email_unsubscribe_tokens t
      WHERE q.message->>'to'=t.email AND t.email='peter@gobold.com.au' AND t.used_at IS NULL
        AND coalesce(q.message->>'unsubscribe_token','')=''
        AND NOT EXISTS(SELECT 1 FROM public.suppressed_emails s WHERE s.email=t.email);
  END IF;
END $$;
