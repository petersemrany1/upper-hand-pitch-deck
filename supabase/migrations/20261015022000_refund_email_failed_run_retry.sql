-- Called only after the provider explicitly reports that the previous run failed.
-- Compare-and-swap keeps concurrent workers on one durable idempotency key.
CREATE OR REPLACE FUNCTION public.renew_failed_refund_email(p_message_id bigint,p_previous_key text,p_next_key text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE changed integer;
BEGIN
  IF p_previous_key IS NULL OR p_next_key IS NULL OR p_previous_key=p_next_key OR length(p_next_key)>200 THEN RETURN false; END IF;
  UPDATE pgmq.q_refund_alert_emails q SET message=jsonb_set(q.message,'{idempotency_key}',to_jsonb(p_next_key))
    WHERE q.msg_id=p_message_id AND q.message->>'idempotency_key'=p_previous_key
      AND q.message->>'label'='refund-alert' AND q.message->>'to'='peter@gobold.com.au'
      AND NOT EXISTS(SELECT 1 FROM public.email_send_log l WHERE l.message_id::text=q.message->>'message_id' AND l.status='sent');
  GET DIAGNOSTICS changed=ROW_COUNT;
  RETURN changed=1;
END $$;
REVOKE ALL ON FUNCTION public.renew_failed_refund_email(bigint,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.renew_failed_refund_email(bigint,text,text) TO service_role;
