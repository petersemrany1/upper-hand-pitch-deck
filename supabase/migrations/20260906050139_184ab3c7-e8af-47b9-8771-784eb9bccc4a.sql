DROP FUNCTION IF EXISTS public.labour_by_key(date, date, text);
CREATE OR REPLACE FUNCTION public.labour_by_key(p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date, p_mode text DEFAULT 'location'::text, p_rep uuid DEFAULT NULL::uuid)
 RETURNS TABLE(key text, hours numeric, hourly_cost numeric, hours_missing_rate numeric, hours_fallback numeric, bookings bigint, bonus_cost numeric, bonus_missing_rate bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
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
           CASE WHEN p_mode = 'ad' THEN k.ad_name ELSE k.location END AS key,
           sum(k.talk_secs) AS talk_secs, sum(k.leads) AS leads
    FROM public.rep_day_key_calls k
    WHERE (CASE WHEN p_mode = 'ad' THEN k.ad_name ELSE k.location END) IS NOT NULL
      AND (p_from IS NULL OR k.work_date >= p_from)
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
    SELECT CASE WHEN p_mode = 'ad' THEN a.ad_name ELSE a.location END AS key,
           a.rep_id, a.cohort_date
    FROM public.booking_rep_attribution a
    WHERE (CASE WHEN p_mode = 'ad' THEN a.ad_name ELSE a.location END) IS NOT NULL
      AND (p_from IS NULL OR a.cohort_date >= p_from)
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

DROP FUNCTION IF EXISTS public.money_monthly(date, date);
CREATE OR REPLACE FUNCTION public.money_monthly(p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date, p_rep uuid DEFAULT NULL::uuid)
 RETURNS TABLE(month date, location text, spend numeric, showed bigint, revenue numeric, labour_cost numeric, bonus_cost numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  WITH spend AS (
    SELECT date_trunc('month', s.date)::date AS month,
           COALESCE(s.location, public.ad_location_from_campaign(s.campaign_name)) AS location,
           sum(s.spend_aud) AS spend
    FROM public.ad_spend_daily s
    WHERE (p_from IS NULL OR s.date >= p_from) AND (p_to IS NULL OR s.date <= p_to)
    GROUP BY 1, 2
  ),
  rev AS (
    SELECT date_trunc('month', (o.created_at AT TIME ZONE 'Australia/Sydney')::date)::date AS month,
           o.location,
           count(*) FILTER (WHERE o.is_showed)::bigint AS showed,
           sum(CASE WHEN o.is_showed THEN COALESCE(pc.price_per_booking, 800) ELSE 0 END) AS revenue
    FROM public.ad_lead_outcomes o
    LEFT JOIN public.clinic_appointments a ON a.id = o.appointment_id
    LEFT JOIN public.partner_clinics pc ON pc.id = a.clinic_id
    WHERE NOT o.unattributed AND o.location IS NOT NULL
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
           sum(CASE WHEN d.hourly_rate IS NOT NULL THEN d.hours * w.wt * d.hourly_rate ELSE 0 END) AS labour_cost
    FROM w JOIN days d ON d.rep_id = w.rep_id AND d.work_date = w.work_date
    WHERE w.wt IS NOT NULL
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