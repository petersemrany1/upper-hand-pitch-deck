-- Match a full international number, never a last-name or partial-number tail.
CREATE OR REPLACE FUNCTION public.sales_journey_phone(p text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path=public AS $$
  WITH cleaned AS (SELECT regexp_replace(coalesce(p,''),'[^0-9]','','g') AS n)
  SELECT CASE WHEN n ~ '^0[23478][0-9]{8}$' THEN '61'||substr(n,2)
              WHEN n ~ '^[23478][0-9]{8}$' THEN '61'||n
              WHEN n ~ '^00[1-9][0-9]{9,14}$' THEN substr(n,3)
              WHEN n ~ '^[1-9][0-9]{9,14}$' THEN n ELSE NULL END FROM cleaned
$$;
REVOKE ALL ON FUNCTION public.sales_journey_phone(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.sales_journey_phone(text) TO authenticated,service_role;

-- Invoker rights preserve existing row access. Sales role is checked even when
-- an older table policy is broader. A single JSON row avoids the API row cap.
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
    'skips',coalesce((SELECT jsonb_agg(e ORDER BY e.created_at DESC,e.id) FROM public.lead_skip_events e WHERE e.lead_id=ANY(related)),'[]'::jsonb)
  );
END $$;
REVOKE ALL ON FUNCTION public.customer_journey(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.customer_journey(uuid) TO authenticated;

CREATE INDEX IF NOT EXISTS meta_leads_journey_phone_idx ON public.meta_leads(public.sales_journey_phone(phone));
CREATE INDEX IF NOT EXISTS call_records_journey_phone_idx ON public.call_records(public.sales_journey_phone(phone)) WHERE clinic_id IS NULL;
CREATE INDEX IF NOT EXISTS sms_threads_journey_phone_idx ON public.sms_threads(public.sales_journey_phone(phone));
CREATE INDEX IF NOT EXISTS sms_messages_journey_phone_idx ON public.sms_messages(public.sales_journey_phone(coalesce(nullif(phone,''),CASE WHEN direction='inbound' THEN from_number ELSE to_number END)));
