ALTER TABLE public.partner_clinics ADD COLUMN IF NOT EXISTS location text;

DROP FUNCTION IF EXISTS public.revenue_by_key(date, date, text);
CREATE FUNCTION public.revenue_by_key(p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date, p_mode text DEFAULT 'location'::text)
RETURNS TABLE(key text, shows bigint, revenue numeric, revenue_list numeric, free_shows bigint)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT CASE WHEN p_mode = 'ad' THEN o.ad_name ELSE COALESCE(pc.location, o.location) END AS key,
         count(*)::bigint,
         sum(COALESCE(er.effective_rate, 0)),
         sum(COALESCE(er.list_rate, 800)),
         count(*) FILTER (WHERE ss.is_free)::bigint
  FROM public.ad_lead_outcomes o
  JOIN public.clinic_appointments a ON a.id = o.appointment_id
  LEFT JOIN public.partner_clinics pc ON pc.id = a.clinic_id
  LEFT JOIN public.clinic_effective_rate er ON er.clinic_id = a.clinic_id
  LEFT JOIN public.clinic_show_slots ss ON ss.appointment_id = a.id
  WHERE o.is_showed
    AND (p_mode <> 'ad' OR NOT o.unattributed)
    AND (CASE WHEN p_mode = 'ad' THEN o.ad_name ELSE COALESCE(pc.location, o.location) END) IS NOT NULL
    AND (p_from IS NULL OR (o.created_at AT TIME ZONE 'Australia/Sydney')::date >= p_from)
    AND (p_to IS NULL OR (o.created_at AT TIME ZONE 'Australia/Sydney')::date <= p_to)
  GROUP BY 1
$function$;

GRANT EXECUTE ON FUNCTION public.revenue_by_key(date, date, text) TO authenticated, service_role;

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
           COALESCE(pc.location, o.location) AS location,
           count(*) FILTER (WHERE o.is_showed)::bigint AS showed,
           sum(CASE WHEN o.is_showed THEN COALESCE(er.effective_rate, 0) ELSE 0 END) AS revenue
    FROM public.ad_lead_outcomes o
    LEFT JOIN public.clinic_appointments a ON a.id = o.appointment_id
    LEFT JOIN public.partner_clinics pc ON pc.id = a.clinic_id
    LEFT JOIN public.clinic_effective_rate er ON er.clinic_id = a.clinic_id
    WHERE COALESCE(pc.location, o.location) IS NOT NULL
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