-- Keep pending deposit alerts invisible until the paperwork grace period ends.
-- Other emails retain immediate delivery. The dispatcher rechecks the live lead status.
CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name TEXT, payload JSONB)
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  delay_seconds INTEGER := 0;
BEGIN
  IF payload->>'label' = 'payment-received'
     AND payload#>>'{payment_booking_alert,not_before}' IS NOT NULL THEN
    delay_seconds := GREATEST(0, CEIL(EXTRACT(EPOCH FROM (
      (payload#>>'{payment_booking_alert,not_before}')::timestamptz - clock_timestamp()
    )))::integer + 1);
  END IF;
  BEGIN
    RETURN pgmq.send(queue_name, payload, delay_seconds);
  EXCEPTION WHEN undefined_table THEN
    PERFORM pgmq.create(queue_name);
    RETURN pgmq.send(queue_name, payload, delay_seconds);
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_email(TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_email(TEXT, JSONB) TO service_role;
