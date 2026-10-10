-- Skips are a separate audit event: never a dial, outcome, or lead status change.
CREATE TABLE public.lead_skip_events (
  id uuid PRIMARY KEY,
  lead_id uuid NOT NULL,
  rep_id uuid NOT NULL,
  rep_name text NOT NULL,
  session_id uuid,
  reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 3 AND 500),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX lead_skip_events_lead_time ON public.lead_skip_events(lead_id, created_at DESC);
CREATE INDEX lead_skip_events_session ON public.lead_skip_events(session_id, rep_id, lead_id);
ALTER TABLE public.lead_skip_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lead_skip_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.lead_skip_events TO authenticated;
CREATE POLICY "Sales staff read lead skips" ON public.lead_skip_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.booking_sales_actor()));

CREATE FUNCTION public.record_lead_skip(p_id uuid, p_lead uuid, p_reason text, p_session uuid DEFAULT NULL)
RETURNS public.lead_skip_events LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE actor uuid; saved public.lead_skip_events; clean_reason text := btrim(p_reason);
BEGIN
  SELECT id INTO actor FROM public.booking_sales_actor();
  IF actor IS NULL THEN RAISE EXCEPTION 'Sales access required'; END IF;
  IF p_id IS NULL OR clean_reason IS NULL OR length(clean_reason) NOT BETWEEN 3 AND 500 THEN
    RAISE EXCEPTION 'Enter a short reason (3 to 500 characters)';
  END IF;
  -- Serialize retries of the same request, including concurrent clicks.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_id::text, 0));
  SELECT * INTO saved FROM public.lead_skip_events WHERE id=p_id;
  IF FOUND THEN
    IF saved.rep_id<>actor OR saved.lead_id<>p_lead OR saved.reason<>clean_reason OR saved.session_id IS DISTINCT FROM p_session THEN
      RAISE EXCEPTION 'This skip request has already been used';
    END IF;
    RETURN saved;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.meta_leads WHERE id=p_lead) THEN RAISE EXCEPTION 'Lead not found'; END IF;
  IF p_session IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.rep_sessions WHERE id=p_session AND rep_id=actor AND ended_at IS NULL) THEN
    RAISE EXCEPTION 'This calling session is no longer open';
  END IF;
  INSERT INTO public.lead_skip_events(id, lead_id, rep_id, rep_name, session_id, reason)
    SELECT p_id, p_lead, actor, coalesce(nullif(name,''),email), p_session, clean_reason FROM public.sales_reps WHERE id=actor
    RETURNING * INTO saved;
  RETURN saved;
END $$;
REVOKE ALL ON FUNCTION public.record_lead_skip(uuid,uuid,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_lead_skip(uuid,uuid,text,uuid) TO authenticated;

-- Fresh, shared-pool call history, beyond the UI's loaded lead limit.
-- Current-session skips are deferred until the next session, never hidden globally.
CREATE FUNCTION public.untouched_sales_leads(p_session uuid, p_before timestamptz)
RETURNS SETOF public.meta_leads LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE actor uuid;
BEGIN
  SELECT id INTO actor FROM public.booking_sales_actor();
  IF actor IS NULL THEN RAISE EXCEPTION 'Sales access required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.rep_sessions WHERE id=p_session AND rep_id=actor AND ended_at IS NULL) THEN
    RAISE EXCEPTION 'This calling session is no longer open';
  END IF;
  RETURN QUERY SELECT l.* FROM public.meta_leads l
    WHERE l.created_at<=p_before
      AND coalesce(l.lead_class,'') NOT IN ('booked_active','post_consult')
      AND NOT EXISTS (SELECT 1 FROM public.call_records c WHERE c.lead_id=l.id AND coalesce(c.direction,'outbound')<>'inbound')
      AND NOT EXISTS (SELECT 1 FROM public.lead_skip_events e WHERE e.lead_id=l.id AND e.rep_id=actor AND e.session_id=p_session)
      AND NOT EXISTS (SELECT 1 FROM public.clinic_appointments a WHERE a.lead_id=l.id AND a.disqualified_at IS NULL
        AND coalesce(a.outcome,'') NOT IN ('disqualified','noshow','no_show','cancelled')
        AND (a.outcome='show' OR a.appointment_date >= (now() AT TIME ZONE 'Australia/Sydney')::date))
      AND NOT EXISTS (SELECT 1 FROM public.clinic_appointments a WHERE a.outcome='show'
        AND nullif(regexp_replace(regexp_replace(coalesce(a.patient_phone,''),'[^0-9]','','g'),'^0','61'),'')
          = nullif(regexp_replace(regexp_replace(coalesce(l.phone,''),'[^0-9]','','g'),'^0','61'),''));
END $$;
REVOKE ALL ON FUNCTION public.untouched_sales_leads(uuid,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.untouched_sales_leads(uuid,timestamptz) TO authenticated;
