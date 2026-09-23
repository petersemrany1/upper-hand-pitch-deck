-- ============= Full file contents =============

-- Numbers page accuracy, round 3 (fine-tooth-comb review, 2026-09-23)
--
-- 1. Spend rows are keyed by the same city rule as leads. Spend rows store a
--    "location" that is just the campaign name minus the brand prefix, so a
--    campaign called "Hair Transplant Perth - Spring" would have made a
--    phantom city "Perth - Spring" with spend and no leads. Now the known
--    city named anywhere in the campaign wins, exactly as it does for leads.
-- 2. Revenue is credited to the same city as the lead's cost (the lead's
--    city, which already falls back to the clinic's city when the lead has
--    none), so profit per city compares like with like.
-- 3. One test-lead rule everywhere: is_test_lead now matches the funnel
--    view's rule, so a real surname starting with "Test" is not thrown out of
--    labour while counting as a lead.
--
-- Lovable does not apply migrations from GitHub; apply through Lovable chat.

-- ---------------------------------------------------------------- helpers
CREATE OR REPLACE FUNCTION public.spend_location(p_campaign text, p_location text)
RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT COALESCE(
    public.ad_location_from_campaign(p_campaign),
    public.ad_location_from_campaign(p_location),
    NULLIF(trim(COALESCE(p_location, '')), '')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_test_lead(_lead uuid)
RETURNS boolean
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT COALESCE((
    SELECT lower(COALESCE(l.first_name, '')) = 'test'
        OR lower(COALESCE(l.last_name, '')) = 'test'
        OR (lower(COALESCE(l.first_name, '')) = 'peter' AND lower(COALESCE(l.last_name, '')) LIKE 'test%')
        OR lower(COALESCE(l.campaign_name, '')) LIKE 'test%'
    FROM public.meta_leads l WHERE l.id = _lead
  ), false)
$$;

-- ---------------------------------------------------------------- per-ad performance
CREATE OR REPLACE FUNCTION public.ad_performance(
  p_from date DEFAULT NULL,
  p_to date DEFAULT NULL,
  p_location text DEFAULT NULL
)
RETURNS TABLE(
  ad_name text, location text, spend numeric, impressions bigint, clicks bigint,
  leads bigint, booked bigint, showed bigint, noshow bigint, upcoming bigint,
  needs_outcome bigint, disqualified bigint, unattributed boolean, name_collision boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH spend AS (
    SELECT lower(s.ad_name) AS k, min(s.ad_name) AS ad_name,
           min(public.spend_location(s.campaign_name, s.location)) AS location,
           sum(s.spend_aud) AS spend, sum(s.impressions)::bigint AS impressions,
           sum(s.clicks)::bigint AS clicks
    FROM public.ad_spend_daily s
    WHERE (p_from IS NULL OR s.date >= p_from)
      AND (p_to IS NULL OR s.date <= p_to)
      AND (p_location IS NULL OR lower(public.spend_location(s.campaign_name, s.location)) = lower(p_location))
    GROUP BY 1
  ),
  leads AS (
    SELECT lower(o.ad_name) AS k, min(o.ad_name) AS ad_name, min(o.location) AS location,
           count(*)::bigint AS leads,
           count(*) FILTER (WHERE o.is_booked)::bigint AS booked,
           count(*) FILTER (WHERE o.is_showed)::bigint AS showed,
           count(*) FILTER (WHERE o.is_noshow)::bigint AS noshow,
           count(*) FILTER (WHERE o.is_upcoming)::bigint AS upcoming,
           count(*) FILTER (WHERE o.needs_outcome)::bigint AS needs_outcome,
           count(*) FILTER (WHERE o.is_disqualified)::bigint AS disqualified
    FROM public.ad_lead_outcomes o
    WHERE NOT o.unattributed
      AND (p_from IS NULL OR (o.created_at AT TIME ZONE 'Australia/Sydney')::date >= p_from)
      AND (p_to IS NULL OR (o.created_at AT TIME ZONE 'Australia/Sydney')::date <= p_to)
      AND (p_location IS NULL OR lower(o.location) = lower(p_location))
    GROUP BY 1
  ),
  lead_span AS (
    SELECT lower(o.ad_name) AS k,
           min((o.created_at AT TIME ZONE 'Australia/Sydney')::date) AS first_lead,
           max((o.created_at AT TIME ZONE 'Australia/Sydney')::date) AS last_lead
    FROM public.ad_lead_outcomes o
    WHERE NOT o.unattributed
    GROUP BY 1
  ),
  collision AS (
    SELECT lower(s.ad_name) AS k, bool_or(
             ls.k IS NOT NULL AND (s.date < ls.first_lead - 7 OR s.date > ls.last_lead + 7)
           ) AS name_collision
    FROM public.ad_spend_daily s
    LEFT JOIN lead_span ls ON ls.k = lower(s.ad_name)
    GROUP BY 1
  ),
  unattr AS (
    SELECT count(*)::bigint AS leads,
           count(*) FILTER (WHERE o.is_booked)::bigint AS booked,
           count(*) FILTER (WHERE o.is_showed)::bigint AS showed,
           count(*) FILTER (WHERE o.is_noshow)::bigint AS noshow,
           count(*) FILTER (WHERE o.is_upcoming)::bigint AS upcoming,
           count(*) FILTER (WHERE o.needs_outcome)::bigint AS needs_outcome,
           count(*) FILTER (WHERE o.is_disqualified)::bigint AS disqualified
    FROM public.ad_lead_outcomes o
    WHERE o.unattributed
      AND (p_from IS NULL OR (o.created_at AT TIME ZONE 'Australia/Sydney')::date >= p_from)
      AND (p_to IS NULL OR (o.created_at AT TIME ZONE 'Australia/Sydney')::date <= p_to)
  )
  SELECT COALESCE(s.ad_name, l.ad_name) AS ad_name,
         COALESCE(l.location, s.location) AS location,
         COALESCE(s.spend, 0) AS spend,
         COALESCE(s.impressions, 0) AS impressions,
         COALESCE(s.clicks, 0) AS clicks,
         COALESCE(l.leads, 0), COALESCE(l.booked, 0), COALESCE(l.showed, 0),
         COALESCE(l.noshow, 0), COALESCE(l.upcoming, 0), COALESCE(l.needs_outcome, 0),
         COALESCE(l.disqualified, 0),
         false AS unattributed,
         COALESCE(c.name_collision, false) AS name_collision
  FROM spend s
  FULL OUTER JOIN leads l ON l.k = s.k
  LEFT JOIN collision c ON c.k = COALESCE(s.k, l.k)
  UNION ALL
  SELECT 'Unattributed', NULL, 0, 0, 0,
         u.leads, u.booked, u.showed, u.noshow, u.upcoming, u.needs_outcome, u.disqualified,
         true, false
  FROM unattr u
  WHERE u.leads > 0 AND p_location IS NULL
$$;

-- ---------------------------------------------------------------- per-city summary
CREATE OR REPLACE FUNCTION public.ad_location_summary(p_from date DEFAULT NULL, p_to date DEFAULT NULL)
RETURNS TABLE(
  location text, spend numeric, leads bigint, booked bigint, showed bigint,
  noshow bigint, upcoming bigint, needs_outcome bigint, disqualified bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH spend AS (
    SELECT public.spend_location(s.campaign_name, s.location) AS location,
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
           public.spend_location(s.campaign_name, s.location) AS location,
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

-- ---------------------------------------------------------------- revenue, keyed like cost
DROP FUNCTION IF EXISTS public.revenue_by_key(date, date, text);
CREATE FUNCTION public.revenue_by_key(p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date, p_mode text DEFAULT 'location'::text)
RETURNS TABLE(key text, shows bigint, revenue numeric, revenue_list numeric, free_shows bigint)
LANGUAGE sql STABLE SET search_path TO 'public' AS $function$
  SELECT CASE WHEN p_mode = 'ad' THEN o.ad_name ELSE o.location END AS key,
         count(*)::bigint,
         sum(COALESCE(er.effective_rate, 0)),
         sum(COALESCE(er.list_rate, 800)),
         count(*) FILTER (WHERE ss.is_free)::bigint
  FROM public.ad_lead_outcomes o
  JOIN public.clinic_appointments a ON a.id = o.appointment_id
  LEFT JOIN public.clinic_effective_rate er ON er.clinic_id = a.clinic_id
  LEFT JOIN public.clinic_show_slots ss ON ss.appointment_id = a.id
  WHERE o.is_showed
    AND (p_mode <> 'ad' OR NOT o.unattributed)
    AND (CASE WHEN p_mode = 'ad' THEN o.ad_name ELSE o.location END) IS NOT NULL
    AND (p_from IS NULL OR (o.created_at AT TIME ZONE 'Australia/Sydney')::date >= p_from)
    AND (p_to IS NULL OR (o.created_at AT TIME ZONE 'Australia/Sydney')::date <= p_to)
  GROUP BY 1
$function$;
GRANT EXECUTE ON FUNCTION public.revenue_by_key(date, date, text) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.money_monthly(date, date, uuid);
CREATE OR REPLACE FUNCTION public.money_monthly(p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date, p_rep uuid DEFAULT NULL::uuid)
 RETURNS TABLE(month date, location text, spend numeric, showed bigint, revenue numeric, labour_cost numeric, bonus_cost numeric)
 LANGUAGE sql STABLE SET search_path TO 'public' AS $function$
  WITH spend AS (
    SELECT date_trunc('month', s.date)::date AS month,
           public.spend_location(s.campaign_name, s.location) AS location,
           sum(s.spend_aud) AS spend
    FROM public.ad_spend_daily s
    WHERE (p_from IS NULL OR s.date >= p_from) AND (p_to IS NULL OR s.date <= p_to)
    GROUP BY 1, 2
  ),
  rev AS (
    SELECT date_trunc('month', (o.created_at AT TIME ZONE 'Australia/Sydney')::date)::date AS month,
           o.location,
           count(*) FILTER (WHERE o.is_showed)::bigint AS showed,
           sum(CASE WHEN o.is_showed THEN COALESCE(er.effective_rate, 0) ELSE 0 END) AS revenue
    FROM public.ad_lead_outcomes o
    LEFT JOIN public.clinic_appointments a ON a.id = o.appointment_id
    LEFT JOIN public.clinic_effective_rate er ON er.clinic_id = a.clinic_id
    WHERE o.location IS NOT NULL
      AND (p_from IS NULL OR (o.created_at AT TIME ZONE 'Australia/Sydney')::date >= p_from)
      AND (p_to IS NULL OR (o.created_at AT TIME ZONE 'Australia/Sydney')::date <= p_to)
    GROUP BY 1, 2
  ),
  days AS (
    SELECT rc.rep_id, rc.work_date, date_trunc('month', rc.work_date)::date AS month,
           COALESCE(o.hours, rc.calc_hours) AS hours, rr.hourly_rate
    FROM public.rep_call_days rc
    LEFT JOIN public.rep_hour_overrides o ON o.rep_id = rc.rep_id AND o.work_date = rc.work_date
    LEFT JOIN LATERAL public.rep_rate_for(rc.rep_id, rc.work_date) rr ON true
    WHERE (p_from IS NULL OR rc.work_date >= p_from) AND (p_to IS NULL OR rc.work_date <= p_to)
      AND (p_rep IS NULL OR rc.rep_id = p_rep)
  ),
  parts AS (
    SELECT k.rep_id, k.work_date, k.location AS key,
           sum(k.talk_secs) AS talk_secs, sum(k.leads) AS leads
    FROM public.rep_day_key_calls k
    WHERE k.location IS NOT NULL
      AND (p_from IS NULL OR k.work_date >= p_from) AND (p_to IS NULL OR k.work_date <= p_to)
      AND (p_rep IS NULL OR k.rep_id = p_rep)
    GROUP BY 1, 2, 3
  ),
  w AS (
    SELECT p.rep_id, p.work_date, p.key,
           CASE WHEN sum(p.talk_secs) OVER (PARTITION BY p.rep_id, p.work_date) > 0
                THEN p.talk_secs::numeric / sum(p.talk_secs) OVER (PARTITION BY p.rep_id, p.work_date)
                ELSE p.leads::numeric / NULLIF(sum(p.leads) OVER (PARTITION BY p.rep_id, p.work_date), 0)
           END AS wt
    FROM parts p
  ),
  lab AS (
    SELECT d.month, w.key AS location,
           sum(d.hours * w.wt * COALESCE(d.hourly_rate, 0)) AS labour_cost
    FROM days d
    JOIN w ON w.rep_id = d.rep_id AND w.work_date = d.work_date
    GROUP BY 1, 2
  ),
  bon AS (
    SELECT date_trunc('month', a.cohort_date)::date AS month, a.location,
           sum(COALESCE(rr.booking_bonus, 0)) AS bonus_cost
    FROM public.booking_rep_attribution a
    LEFT JOIN LATERAL public.rep_rate_for(a.rep_id, a.cohort_date) rr ON true
    WHERE a.location IS NOT NULL
      AND (p_from IS NULL OR a.cohort_date >= p_from) AND (p_to IS NULL OR a.cohort_date <= p_to)
      AND (p_rep IS NULL OR a.rep_id = p_rep)
    GROUP BY 1, 2
  ),
  keys AS (
    SELECT month, location FROM spend WHERE location IS NOT NULL
    UNION SELECT month, location FROM rev
    UNION SELECT month, location FROM lab
    UNION SELECT month, location FROM bon
  )
  SELECT k.month, k.location,
         COALESCE(s.spend, 0), COALESCE(r.showed, 0), COALESCE(r.revenue, 0),
         COALESCE(l.labour_cost, 0), COALESCE(b.bonus_cost, 0)
  FROM keys k
  LEFT JOIN spend s ON s.month = k.month AND lower(s.location) = lower(k.location)
  LEFT JOIN rev r ON r.month = k.month AND lower(r.location) = lower(k.location)
  LEFT JOIN lab l ON l.month = k.month AND lower(l.location) = lower(k.location)
  LEFT JOIN bon b ON b.month = k.month AND lower(b.location) = lower(k.location)
  ORDER BY 1, 2
$function$;
GRANT EXECUTE ON FUNCTION public.money_monthly(date, date, uuid) TO authenticated, service_role;