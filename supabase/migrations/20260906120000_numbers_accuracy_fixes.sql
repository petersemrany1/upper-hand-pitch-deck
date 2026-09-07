-- Numbers page accuracy fixes (2026-09-06)
--
-- 1. City detection: find a known city anywhere in the campaign name instead
--    of relying on a "Hair Transplant <City>" prefix, so "Byron Bay –
--    Retargeting" and "Sydney | Lookalike" both land in the right city.
-- 2. Rate fallback: hours worked before a rep's first rate row now cost at
--    that first rate instead of being left unpriced.
-- 3. Rep hours: a calling day is now the sum of calling sessions, where a
--    gap of 45+ minutes between calls is a break. Five calls spread across
--    9am–5pm no longer count as eight hours.

-- 1. -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ad_location_from_campaign(p_campaign text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  WITH cities(name) AS (
    VALUES ('Byron Bay'), ('Gold Coast'), ('Sunshine Coast'), ('Central Coast'),
           ('Melbourne'), ('Sydney'), ('Perth'), ('Brisbane'), ('Adelaide'),
           ('Canberra'), ('Hobart'), ('Darwin'), ('Newcastle'), ('Cairns'),
           ('Geelong'), ('Wollongong'), ('Townsville')
  )
  SELECT COALESCE(
    (SELECT c.name FROM cities c
      WHERE COALESCE(p_campaign, '') ILIKE '%' || c.name || '%'
      ORDER BY length(c.name) DESC
      LIMIT 1),
    NULLIF(trim(regexp_replace(COALESCE(p_campaign, ''), '^hair\s+transplant\s+', '', 'i')), '')
  )
$$;

-- 2. -----------------------------------------------------------------------
-- Hours before a rep's first rate row are priced at that first rate
-- (Peter's decision, 2026-09-06). A rep with no rate rows at all still
-- returns nothing, so their hours keep showing as "no rate set".
CREATE OR REPLACE FUNCTION public.rep_rate_for(_rep uuid, _date date)
RETURNS TABLE(hourly_rate numeric, booking_bonus numeric)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT COALESCE(x.hourly_rate, f.hourly_rate) AS hourly_rate,
         COALESCE(x.booking_bonus, f.booking_bonus) AS booking_bonus
  FROM (SELECT 1) AS one
  LEFT JOIN LATERAL (
    SELECT r.hourly_rate, r.booking_bonus
    FROM public.rep_rates r
    WHERE r.rep_id = _rep
      AND r.effective_from <= _date
      AND (r.effective_to IS NULL OR r.effective_to >= _date)
    ORDER BY r.effective_from DESC
    LIMIT 1
  ) x ON true
  LEFT JOIN LATERAL (
    SELECT r.hourly_rate, r.booking_bonus
    FROM public.rep_rates r
    WHERE r.rep_id = _rep
    ORDER BY r.effective_from ASC
    LIMIT 1
  ) f ON true
  WHERE f.hourly_rate IS NOT NULL OR f.booking_bonus IS NOT NULL
$$;

-- 3. -----------------------------------------------------------------------
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
