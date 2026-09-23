-- Numbers page accuracy, round 2 (Peter's decisions, 2026-09-23)
--
-- 1. "Booked the procedure" (outcome 'proceeded') is a show: it counts in
--    shows, the show rate and revenue, as it already did in pack tracking.
-- 2. A lead with no ad on it still belongs to a city when we are sure of it:
--    the city the person typed on the form, or the city of the clinic they
--    were booked into. Only the four markets we run (Melbourne, Perth,
--    Byron Bay, Sydney) count; anything else stays "Website".
-- 3. Calls with no rep on them: an inbound call belongs to the rep who owns
--    that lead, otherwise to Peter, who answers every inbound call. Outbound
--    calls with no rep (a handful from May) are Peter's too.
-- 4. Calling time on leads that still have no city goes into its own
--    "Website" bucket instead of being spread over the cities.
-- 5. The booking bonus is paid on disqualified bookings too.
--
-- Lovable does not apply migrations from GitHub: paste this whole file into
-- the Supabase SQL editor for project sfwokpeeffgrkxaptqji and run it once.

-- ---------------------------------------------------------------- helpers
CREATE OR REPLACE FUNCTION public.peter_rep_id()
RETURNS uuid
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT id FROM public.sales_reps WHERE name ILIKE '%peter%semrany%' ORDER BY created_at LIMIT 1
$$;

-- The four markets we run ads in. A form answer or a clinic address is
-- matched against these; anything else is not a city we report on.
CREATE OR REPLACE FUNCTION public.market_city(p_text text)
RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN p_text ILIKE '%byron%'     THEN 'Byron Bay'
    WHEN p_text ILIKE '%melbourne%' THEN 'Melbourne'
    WHEN p_text ILIKE '%perth%'     THEN 'Perth'
    WHEN p_text ILIKE '%sydney%'    THEN 'Sydney'
  END
$$;

-- Where a lead belongs: the campaign's city; else the city the person typed
-- on the form (top level or nested payload); else the city of the clinic
-- they were booked into. NULL when none of those is certain.
CREATE OR REPLACE FUNCTION public.lead_location(_campaign text, _payload jsonb, _lead uuid)
RETURNS text
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT COALESCE(
    public.ad_location_from_campaign(_campaign),
    public.market_city(COALESCE(_payload->>'location', _payload->'raw_payload'->>'location')),
    (SELECT public.market_city(COALESCE(pc.location, pc.city))
       FROM public.clinic_appointments a
       JOIN public.partner_clinics pc ON pc.id = a.clinic_id
      WHERE a.lead_id = _lead
      ORDER BY a.appointment_date ASC, a.created_at ASC
      LIMIT 1)
  )
$$;

-- ---------------------------------------------------------------- 1 + 2: the funnel view
CREATE OR REPLACE VIEW public.ad_lead_outcomes
WITH (security_invoker = true) AS
WITH first_appt AS (
  SELECT DISTINCT ON (a.lead_id)
    a.lead_id, a.id AS appointment_id, a.appointment_date, a.appointment_time,
    a.outcome, a.clinic_id, a.patient_name
  FROM public.clinic_appointments a
  WHERE a.lead_id IS NOT NULL
  ORDER BY a.lead_id, a.appointment_date ASC, a.created_at ASC
)
SELECT
  l.id AS lead_id,
  l.created_at,
  l.first_name, l.last_name, l.phone, l.status,
  NULLIF(trim(l.ad_name), '') AS ad_name,
  NULLIF(trim(l.ad_set_name), '') AS adset_name,
  NULLIF(trim(l.campaign_name), '') AS campaign_name,
  public.lead_location(l.campaign_name, l.raw_payload, l.id) AS location,
  (NULLIF(trim(l.ad_name), '') IS NULL OR NULLIF(trim(l.campaign_name), '') IS NULL) AS unattributed,
  f.appointment_id, f.appointment_date, f.appointment_time, f.outcome,
  (f.appointment_id IS NOT NULL AND COALESCE(f.outcome, '') <> 'disqualified') AS is_booked,
  (f.outcome = 'disqualified') AS is_disqualified,
  (f.outcome IN ('show', 'proceeded')) AS is_showed,
  (f.outcome = 'noshow') AS is_noshow,
  (f.appointment_id IS NOT NULL AND f.outcome IS NULL
     AND f.appointment_date >= (now() AT TIME ZONE 'Australia/Sydney')::date) AS is_upcoming,
  (f.appointment_id IS NOT NULL AND f.outcome IS NULL
     AND f.appointment_date < (now() AT TIME ZONE 'Australia/Sydney')::date) AS needs_outcome
FROM public.meta_leads l
LEFT JOIN first_appt f ON f.lead_id = l.id
WHERE NOT (lower(COALESCE(l.first_name,'')) = 'peter' AND lower(COALESCE(l.last_name,'')) LIKE 'test%')
  AND lower(COALESCE(l.first_name,'')) <> 'test'
  AND lower(COALESCE(l.last_name,'')) <> 'test'
  AND lower(COALESCE(l.campaign_name,'')) NOT LIKE 'test%';

-- Per-city funnel: a lead with a city counts in that city whether or not an
-- ad is on it. Spend still comes from the ads alone.
CREATE OR REPLACE FUNCTION public.ad_location_summary(p_from date DEFAULT NULL, p_to date DEFAULT NULL)
RETURNS TABLE(
  location text, spend numeric, leads bigint, booked bigint, showed bigint,
  noshow bigint, upcoming bigint, needs_outcome bigint, disqualified bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH spend AS (
    SELECT COALESCE(s.location, public.ad_location_from_campaign(s.campaign_name)) AS location,
           sum(s.spend_aud) AS spend
    FROM public.ad_spend_daily s
    WHERE (p_from IS NULL OR s.date >= p_from) AND (p_to IS NULL OR s.date <= p_to)
    GROUP BY 1
  ),
  leads AS (
    SELECT o.location,
           count(*)::bigint AS leads,
           count(*) FILTER (WHERE o.is_booked)::bigint AS booked,
           count(*) FILTER (WHERE o.is_showed)::bigint AS showed,
           count(*) FILTER (WHERE o.is_noshow)::bigint AS noshow,
           count(*) FILTER (WHERE o.is_upcoming)::bigint AS upcoming,
           count(*) FILTER (WHERE o.needs_outcome)::bigint AS needs_outcome,
           count(*) FILTER (WHERE o.is_disqualified)::bigint AS disqualified
    FROM public.ad_lead_outcomes o
    WHERE o.location IS NOT NULL
      AND (p_from IS NULL OR (o.created_at AT TIME ZONE 'Australia/Sydney')::date >= p_from)
      AND (p_to IS NULL OR (o.created_at AT TIME ZONE 'Australia/Sydney')::date <= p_to)
    GROUP BY 1
  )
  SELECT COALESCE(l.location, s.location) AS location,
         COALESCE(s.spend, 0), COALESCE(l.leads, 0), COALESCE(l.booked, 0),
         COALESCE(l.showed, 0), COALESCE(l.noshow, 0), COALESCE(l.upcoming, 0),
         COALESCE(l.needs_outcome, 0), COALESCE(l.disqualified, 0)
  FROM leads l
  FULL OUTER JOIN spend s ON lower(s.location) = lower(l.location)
  WHERE COALESCE(l.location, s.location) IS NOT NULL
$$;

CREATE OR REPLACE FUNCTION public.ad_cost_per_show_monthly(p_from date DEFAULT NULL, p_to date DEFAULT NULL)
RETURNS TABLE(month date, location text, spend numeric, showed bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH spend AS (
    SELECT date_trunc('month', s.date)::date AS month,
           COALESCE(s.location, public.ad_location_from_campaign(s.campaign_name)) AS location,
           sum(s.spend_aud) AS spend
    FROM public.ad_spend_daily s
    WHERE (p_from IS NULL OR s.date >= p_from) AND (p_to IS NULL OR s.date <= p_to)
    GROUP BY 1, 2
  ),
  shows AS (
    SELECT date_trunc('month', (o.created_at AT TIME ZONE 'Australia/Sydney')::date)::date AS month,
           o.location, count(*) FILTER (WHERE o.is_showed)::bigint AS showed
    FROM public.ad_lead_outcomes o
    WHERE o.location IS NOT NULL
      AND (p_from IS NULL OR (o.created_at AT TIME ZONE 'Australia/Sydney')::date >= p_from)
      AND (p_to IS NULL OR (o.created_at AT TIME ZONE 'Australia/Sydney')::date <= p_to)
    GROUP BY 1, 2
  )
  SELECT COALESCE(sp.month, sh.month) AS month,
         COALESCE(sp.location, sh.location) AS location,
         COALESCE(sp.spend, 0), COALESCE(sh.showed, 0)
  FROM spend sp
  FULL OUTER JOIN shows sh ON sh.month = sp.month AND lower(sh.location) = lower(sp.location)
  WHERE COALESCE(sp.location, sh.location) IS NOT NULL
  ORDER BY 1, 2
$$;

-- ---------------------------------------------------------------- 3: who made the call
-- Every inbound call rings Peter's browser and is logged with no rep. It is
-- the lead's rep's call if the lead has one, otherwise Peter's. The few
-- outbound calls with no rep are Peter's as well.
CREATE OR REPLACE VIEW public.rep_call_days AS
WITH calls AS (
  SELECT COALESCE(c.rep_id, CASE WHEN c.direction = 'inbound' THEN l.rep_id END, public.peter_rep_id()) AS rep_id,
         (c.called_at AT TIME ZONE 'Australia/Sydney')::date AS work_date,
         c.called_at,
         c.called_at + make_interval(secs => COALESCE(c.duration, 0)) AS ended_at
  FROM public.call_records c
  LEFT JOIN public.meta_leads l ON l.id = c.lead_id
  WHERE c.called_at IS NOT NULL
    AND NOT public.is_test_lead(c.lead_id)
),
ordered AS (
  SELECT calls.*,
         max(ended_at) OVER (
           PARTITION BY rep_id, work_date ORDER BY called_at
           ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
         ) AS prev_end
  FROM calls
  WHERE rep_id IS NOT NULL
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

-- Talk time per rep-day, split by the lead's city (or ad). A lead with no
-- city keeps its own row (location NULL) so labour_by_key can bucket it.
CREATE OR REPLACE VIEW public.rep_day_key_calls AS
SELECT COALESCE(c.rep_id, CASE WHEN c.direction = 'inbound' THEN l.rep_id END, public.peter_rep_id()) AS rep_id,
       (c.called_at AT TIME ZONE 'Australia/Sydney')::date AS work_date,
       public.lead_location(l.campaign_name, l.raw_payload, l.id) AS location,
       NULLIF(btrim(l.ad_name), '') AS ad_name,
       sum(COALESCE(c.duration, 0))::bigint AS talk_secs,
       count(DISTINCT c.lead_id)::bigint AS leads
FROM public.call_records c
JOIN public.meta_leads l ON l.id = c.lead_id
WHERE c.called_at IS NOT NULL
  AND NOT public.is_test_lead(c.lead_id)
GROUP BY 1, 2, 3, 4;
ALTER VIEW public.rep_day_key_calls SET (security_invoker = true);

-- ---------------------------------------------------------------- 5: bonuses on every booking
CREATE OR REPLACE VIEW public.booking_rep_attribution AS
SELECT a.id AS appointment_id,
       a.lead_id,
       (l.created_at AT TIME ZONE 'Australia/Sydney')::date AS cohort_date,
       (COALESCE(a.booked_at, a.created_at) AT TIME ZONE 'Australia/Sydney')::date AS booked_date,
       COALESCE(cr.rep_id, l.rep_id) AS rep_id,
       CASE WHEN cr.rep_id IS NOT NULL THEN 'call'
            WHEN l.rep_id IS NOT NULL THEN 'lead'
            ELSE 'unresolved' END AS attribution,
       public.lead_location(l.campaign_name, l.raw_payload, l.id) AS location,
       NULLIF(btrim(l.ad_name), '') AS ad_name
FROM public.clinic_appointments a
JOIN public.meta_leads l ON l.id = a.lead_id
LEFT JOIN LATERAL (
  SELECT c.rep_id FROM public.call_records c
  WHERE c.lead_id = a.lead_id AND c.rep_id IS NOT NULL
    AND c.called_at <= COALESCE(a.booked_at, a.created_at)
  ORDER BY c.called_at DESC LIMIT 1
) cr ON true
WHERE NOT public.is_test_lead(a.lead_id);
ALTER VIEW public.booking_rep_attribution SET (security_invoker = true);

-- ---------------------------------------------------------------- 4: labour, with a Website bucket
-- Same as before except: calls on leads with no city (or, by ad, no ad name)
-- form their own "Website" key, so their time is no longer spread over the
-- cities. The page keeps that key out of the city list and in the total.
DROP FUNCTION IF EXISTS public.labour_by_key(date, date, text, uuid);
CREATE OR REPLACE FUNCTION public.labour_by_key(p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date, p_mode text DEFAULT 'location'::text, p_rep uuid DEFAULT NULL::uuid)
RETURNS TABLE(key text, hours numeric, hourly_cost numeric, hours_missing_rate numeric, hours_fallback numeric, bookings bigint, bonus_cost numeric, bonus_missing_rate bigint)
LANGUAGE sql STABLE SET search_path TO 'public' AS $function$
  WITH days AS (
    SELECT rc.rep_id, rc.work_date,
           COALESCE(o.hours, rc.calc_hours) AS hours,
           rr.hourly_rate
    FROM public.rep_call_days rc
    LEFT JOIN public.rep_hour_overrides o ON o.rep_id = rc.rep_id AND o.work_date = rc.work_date
    LEFT JOIN LATERAL public.rep_rate_for(rc.rep_id, rc.work_date) rr ON true
    WHERE (p_from IS NULL OR rc.work_date >= p_from)
      AND (p_to IS NULL OR rc.work_date <= p_to)
      AND (p_rep IS NULL OR rc.rep_id = p_rep)
  ),
  parts AS (
    SELECT k.rep_id, k.work_date,
           COALESCE(CASE WHEN p_mode = 'ad' THEN k.ad_name ELSE k.location END, 'Website') AS key,
           sum(k.talk_secs) AS talk_secs, sum(k.leads) AS leads
    FROM public.rep_day_key_calls k
    WHERE (p_from IS NULL OR k.work_date >= p_from)
      AND (p_to IS NULL OR k.work_date <= p_to)
      AND (p_rep IS NULL OR k.rep_id = p_rep)
    GROUP BY 1, 2, 3
  ),
  w AS (
    SELECT p.rep_id, p.work_date, p.key,
           CASE WHEN sum(p.talk_secs) OVER (PARTITION BY p.rep_id, p.work_date) > 0
                THEN p.talk_secs::numeric / sum(p.talk_secs) OVER (PARTITION BY p.rep_id, p.work_date)
                ELSE p.leads::numeric / NULLIF(sum(p.leads) OVER (PARTITION BY p.rep_id, p.work_date), 0)
           END AS wt,
           (sum(p.talk_secs) OVER (PARTITION BY p.rep_id, p.work_date) = 0) AS is_fallback
    FROM parts p
  ),
  alloc AS (
    SELECT w.key, d.hours * w.wt AS hours, d.hourly_rate,
           CASE WHEN w.is_fallback THEN d.hours * w.wt ELSE 0 END AS fb
    FROM w JOIN days d ON d.rep_id = w.rep_id AND d.work_date = w.work_date
    WHERE w.wt IS NOT NULL
  ),
  lab AS (
    SELECT a.key, sum(a.hours) AS hours,
           sum(CASE WHEN a.hourly_rate IS NOT NULL THEN a.hours * a.hourly_rate ELSE 0 END) AS hourly_cost,
           sum(CASE WHEN a.hourly_rate IS NULL THEN a.hours ELSE 0 END) AS hours_missing_rate,
           sum(a.fb) AS hours_fallback
    FROM alloc a GROUP BY 1
  ),
  un AS (
    SELECT '(unallocated)'::text AS key, sum(d.hours) AS hours,
           sum(CASE WHEN d.hourly_rate IS NOT NULL THEN d.hours * d.hourly_rate ELSE 0 END) AS hourly_cost,
           sum(CASE WHEN d.hourly_rate IS NULL THEN d.hours ELSE 0 END) AS hours_missing_rate,
           0::numeric AS hours_fallback
    FROM days d
    WHERE NOT EXISTS (SELECT 1 FROM parts p WHERE p.rep_id = d.rep_id AND p.work_date = d.work_date)
    HAVING sum(d.hours) > 0
  ),
  lab_all AS (SELECT * FROM lab UNION ALL SELECT * FROM un),
  bkeys AS (
    SELECT COALESCE(CASE WHEN p_mode = 'ad' THEN a.ad_name ELSE a.location END, 'Website') AS key,
           a.rep_id, a.cohort_date
    FROM public.booking_rep_attribution a
    WHERE (p_from IS NULL OR a.cohort_date >= p_from)
      AND (p_to IS NULL OR a.cohort_date <= p_to)
      AND (p_rep IS NULL OR a.rep_id = p_rep)
  ),
  bon AS (
    SELECT b.key, count(*)::bigint AS bookings,
           sum(COALESCE(rr.booking_bonus, 0)) AS bonus_cost,
           count(*) FILTER (WHERE rr.booking_bonus IS NULL)::bigint AS bonus_missing_rate
    FROM bkeys b
    LEFT JOIN LATERAL public.rep_rate_for(b.rep_id, b.cohort_date) rr ON true
    GROUP BY 1
  )
  SELECT COALESCE(l.key, b.key),
         COALESCE(l.hours, 0), COALESCE(l.hourly_cost, 0), COALESCE(l.hours_missing_rate, 0),
         COALESCE(l.hours_fallback, 0), COALESCE(b.bookings, 0), COALESCE(b.bonus_cost, 0),
         COALESCE(b.bonus_missing_rate, 0)
  FROM lab_all l
  FULL OUTER JOIN bon b ON lower(b.key) = lower(l.key)
$function$;
GRANT EXECUTE ON FUNCTION public.labour_by_key(date, date, text, uuid) TO authenticated, service_role;
