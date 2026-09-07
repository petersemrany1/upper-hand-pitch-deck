-- Keep the sandbox test leads out of labour and bonuses (2026-09-07)
--
-- Calls placed to the test leads from the admin sandbox were counting as
-- paid rep hours and, if a test booking was made, as bonus-earning bookings.
-- Applies after 20260907073239 (the Numbers accuracy fixes).

-- Sandbox calls to the test leads must never count as paid work or bonuses.
CREATE OR REPLACE FUNCTION public.is_test_lead(_lead uuid)
RETURNS boolean
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT COALESCE((
    SELECT lower(COALESCE(l.first_name, '')) = 'test'
        OR lower(COALESCE(l.last_name, '')) LIKE 'test%'
        OR lower(COALESCE(l.campaign_name, '')) LIKE 'test%'
    FROM public.meta_leads l WHERE l.id = _lead
  ), false)
$$;

CREATE OR REPLACE VIEW public.rep_call_days AS
WITH calls AS (
  SELECT c.rep_id,
         (c.called_at AT TIME ZONE 'Australia/Sydney')::date AS work_date,
         c.called_at,
         c.called_at + make_interval(secs => COALESCE(c.duration, 0)) AS ended_at
  FROM public.call_records c
  WHERE c.rep_id IS NOT NULL
    AND NOT public.is_test_lead(c.lead_id)
),
ordered AS (
  SELECT calls.*,
         max(ended_at) OVER (
           PARTITION BY rep_id, work_date ORDER BY called_at
           ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
         ) AS prev_end
  FROM calls
),
flagged AS (
  SELECT ordered.*,
         CASE WHEN prev_end IS NULL OR called_at > prev_end + interval '45 minutes' THEN 1 ELSE 0 END AS new_session
  FROM ordered
),
sessions AS (
  SELECT flagged.*,
         sum(new_session) OVER (PARTITION BY rep_id, work_date ORDER BY called_at ROWS UNBOUNDED PRECEDING) AS session_no
  FROM flagged
),
per_session AS (
  SELECT rep_id, work_date, session_no,
         count(*) AS calls,
         min(called_at) AS s_start,
         max(ended_at) AS s_end
  FROM sessions
  GROUP BY 1, 2, 3
)
SELECT rep_id,
       work_date,
       sum(calls)::bigint AS calls,
       min(s_start) AS first_call,
       max(s_end) AS last_call,
       -- each session counts at least 5 minutes so a lone call isn't free
       round((sum(GREATEST(extract(epoch FROM (s_end - s_start)), 300)) / 3600.0)::numeric, 2) AS calc_hours
FROM per_session
GROUP BY 1, 2;

ALTER VIEW public.rep_call_days SET (security_invoker = true);

-- 4. -----------------------------------------------------------------------
-- Same test-lead exclusion for the talk-time split and booking bonuses.
CREATE OR REPLACE VIEW public.rep_day_key_calls AS
SELECT c.rep_id,
       (c.called_at AT TIME ZONE 'Australia/Sydney')::date AS work_date,
       public.ad_location_from_campaign(l.campaign_name) AS location,
       NULLIF(btrim(l.ad_name), '') AS ad_name,
       sum(COALESCE(c.duration, 0))::bigint AS talk_secs,
       count(DISTINCT c.lead_id)::bigint AS leads
FROM public.call_records c
JOIN public.meta_leads l ON l.id = c.lead_id
WHERE c.rep_id IS NOT NULL
  AND NOT public.is_test_lead(c.lead_id)
GROUP BY 1, 2, 3, 4;

ALTER VIEW public.rep_day_key_calls SET (security_invoker = true);

CREATE OR REPLACE VIEW public.booking_rep_attribution AS
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
  AND NOT public.is_test_lead(a.lead_id);

ALTER VIEW public.booking_rep_attribution SET (security_invoker = true);
