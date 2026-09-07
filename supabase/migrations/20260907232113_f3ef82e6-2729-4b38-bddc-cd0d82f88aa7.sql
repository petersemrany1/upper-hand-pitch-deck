-- Keep the sandbox test leads out of labour and bonuses (2026-09-07)
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
       round((sum(GREATEST(extract(epoch FROM (s_end - s_start)), 300)) / 3600.0)::numeric, 2) AS calc_hours
FROM per_session
GROUP BY 1, 2;

ALTER VIEW public.rep_call_days SET (security_invoker = true);

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