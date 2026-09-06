CREATE OR REPLACE VIEW public.rep_day_key_calls
WITH (security_invoker = true) AS
SELECT c.rep_id,
       (c.called_at AT TIME ZONE 'Australia/Sydney')::date AS work_date,
       public.ad_location_from_campaign(l.campaign_name) AS location,
       NULLIF(btrim(l.ad_name), '') AS ad_name,
       sum(COALESCE(c.duration, 0))::bigint AS talk_secs,
       count(DISTINCT c.lead_id)::bigint AS leads
FROM public.call_records c
JOIN public.meta_leads l ON l.id = c.lead_id
WHERE c.rep_id IS NOT NULL
  AND NOT (lower(COALESCE(l.first_name, '')) = 'peter' AND lower(COALESCE(l.last_name, '')) LIKE 'test%')
  AND lower(COALESCE(l.first_name, '')) <> 'test'
  AND lower(COALESCE(l.last_name, '')) <> 'test'
  AND lower(COALESCE(l.campaign_name, '')) NOT LIKE 'test%'
GROUP BY 1, 2, 3, 4;

CREATE OR REPLACE VIEW public.booking_rep_attribution
WITH (security_invoker = true) AS
SELECT a.id AS appointment_id,
       a.lead_id,
       (l.created_at AT TIME ZONE 'Australia/Sydney')::date AS cohort_date,
       (COALESCE(a.booked_at, a.created_at) AT TIME ZONE 'Australia/Sydney')::date AS booked_date,
       COALESCE(cr.rep_id, l.rep_id) AS rep_id,
       CASE WHEN cr.rep_id IS NOT NULL THEN 'call'
            WHEN l.rep_id IS NOT NULL THEN 'lead'
            ELSE 'unresolved' END AS attribution,
       public.ad_location_from_campaign(l.campaign_name) AS location,
       NULLIF(btrim(l.ad_name), '') AS ad_name
FROM public.clinic_appointments a
JOIN public.meta_leads l ON l.id = a.lead_id
LEFT JOIN LATERAL (
  SELECT c.rep_id FROM public.call_records c
  WHERE c.lead_id = a.lead_id AND c.rep_id IS NOT NULL
    AND c.called_at <= COALESCE(a.booked_at, a.created_at)
  ORDER BY c.called_at DESC LIMIT 1
) cr ON true
WHERE COALESCE(a.outcome, '') <> 'disqualified'
  AND NOT (lower(COALESCE(l.first_name, '')) = 'peter' AND lower(COALESCE(l.last_name, '')) LIKE 'test%')
  AND lower(COALESCE(l.first_name, '')) <> 'test'
  AND lower(COALESCE(l.last_name, '')) <> 'test'
  AND lower(COALESCE(l.campaign_name, '')) NOT LIKE 'test%';