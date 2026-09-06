-- =========================================================
-- 1. RATES (per rep, effective dated)
-- =========================================================
CREATE TABLE public.rep_rates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rep_id uuid NOT NULL REFERENCES public.sales_reps(id) ON DELETE CASCADE,
  hourly_rate numeric,
  booking_bonus numeric,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rep_rates_range_ok CHECK (effective_to IS NULL OR effective_to >= effective_from)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rep_rates TO authenticated;
GRANT ALL ON public.rep_rates TO service_role;
ALTER TABLE public.rep_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view rep rates" ON public.rep_rates
  FOR SELECT TO authenticated USING (public.current_sales_rep_id() IS NOT NULL);
CREATE POLICY "Admins manage rep rates" ON public.rep_rates
  FOR ALL TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
CREATE TRIGGER rep_rates_updated_at BEFORE UPDATE ON public.rep_rates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX rep_rates_rep_idx ON public.rep_rates(rep_id, effective_from DESC);

-- =========================================================
-- 2. MANUAL HOUR OVERRIDES
-- =========================================================
CREATE TABLE public.rep_hour_overrides (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rep_id uuid NOT NULL REFERENCES public.sales_reps(id) ON DELETE CASCADE,
  work_date date NOT NULL,
  hours numeric NOT NULL CHECK (hours >= 0 AND hours <= 24),
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rep_id, work_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rep_hour_overrides TO authenticated;
GRANT ALL ON public.rep_hour_overrides TO service_role;
ALTER TABLE public.rep_hour_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view hour overrides" ON public.rep_hour_overrides
  FOR SELECT TO authenticated USING (public.current_sales_rep_id() IS NOT NULL);
CREATE POLICY "Admins manage hour overrides" ON public.rep_hour_overrides
  FOR ALL TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
CREATE TRIGGER rep_hour_overrides_updated_at BEFORE UPDATE ON public.rep_hour_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 3. RATE LOOKUP
-- =========================================================
CREATE OR REPLACE FUNCTION public.rep_rate_for(_rep uuid, _date date)
RETURNS TABLE(hourly_rate numeric, booking_bonus numeric)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT r.hourly_rate, r.booking_bonus
  FROM public.rep_rates r
  WHERE r.rep_id = _rep
    AND r.effective_from <= _date
    AND (r.effective_to IS NULL OR r.effective_to >= _date)
  ORDER BY r.effective_from DESC
  LIMIT 1
$$;

-- =========================================================
-- 4. AUTO HOURS PER REP PER DAY (attempted + connected)
-- =========================================================
CREATE OR REPLACE VIEW public.rep_call_days AS
SELECT c.rep_id,
       (c.called_at AT TIME ZONE 'Australia/Sydney')::date AS work_date,
       count(*)::bigint AS calls,
       min(c.called_at) AS first_call,
       max(c.called_at + make_interval(secs => COALESCE(c.duration, 0))) AS last_call,
       round(
         GREATEST(
           extract(epoch FROM (
             max(c.called_at + make_interval(secs => COALESCE(c.duration, 0))) - min(c.called_at)
           )) / 3600.0, 0)::numeric, 2) AS calc_hours
FROM public.call_records c
WHERE c.rep_id IS NOT NULL
GROUP BY 1, 2;

-- Per rep-day call time split by location / ad
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
GROUP BY 1, 2, 3, 4;

-- =========================================================
-- 5. BOOKING -> REP ATTRIBUTION
-- =========================================================
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
WHERE COALESCE(a.outcome, '') <> 'disqualified';

-- =========================================================
-- 6. REP-DAY REPORT (Rep hours screen)
-- =========================================================
CREATE OR REPLACE FUNCTION public.rep_hours_report(p_from date DEFAULT NULL, p_to date DEFAULT NULL)
RETURNS TABLE(
  rep_id uuid, rep_name text, work_date date, calls bigint,
  first_call timestamptz, last_call timestamptz,
  calc_hours numeric, override_hours numeric, override_note text, effective_hours numeric,
  hourly_rate numeric, booking_bonus numeric, has_rate boolean,
  bookings bigint, bookings_unresolved bigint,
  hourly_cost numeric, bonus_cost numeric,
  flag_long boolean, flag_sparse boolean, flag_no_location boolean
)
LANGUAGE sql STABLE SET search_path = public AS $$
  WITH d AS (
    SELECT rc.*, o.hours AS override_hours, o.note AS override_note
    FROM public.rep_call_days rc
    LEFT JOIN public.rep_hour_overrides o ON o.rep_id = rc.rep_id AND o.work_date = rc.work_date
    WHERE (p_from IS NULL OR rc.work_date >= p_from)
      AND (p_to IS NULL OR rc.work_date <= p_to)
  )
  SELECT d.rep_id,
         COALESCE(r.name, '(unknown rep)') AS rep_name,
         d.work_date, d.calls, d.first_call, d.last_call,
         d.calc_hours, d.override_hours, d.override_note,
         COALESCE(d.override_hours, d.calc_hours) AS effective_hours,
         rr.hourly_rate, rr.booking_bonus,
         (rr.hourly_rate IS NOT NULL) AS has_rate,
         COALESCE(b.bookings, 0), COALESCE(b.unresolved, 0),
         CASE WHEN rr.hourly_rate IS NULL THEN NULL
              ELSE round(COALESCE(d.override_hours, d.calc_hours) * rr.hourly_rate, 2) END,
         CASE WHEN rr.booking_bonus IS NULL THEN NULL
              ELSE round(COALESCE(b.bookings, 0) * rr.booking_bonus, 2) END,
         (COALESCE(d.override_hours, d.calc_hours) > 9) AS flag_long,
         (d.calls < 5 AND COALESCE(d.override_hours, d.calc_hours) > 4) AS flag_sparse,
         NOT EXISTS (
           SELECT 1 FROM public.rep_day_key_calls k
           WHERE k.rep_id = d.rep_id AND k.work_date = d.work_date AND k.location IS NOT NULL
         ) AS flag_no_location
  FROM d
  LEFT JOIN public.sales_reps r ON r.id = d.rep_id
  LEFT JOIN LATERAL public.rep_rate_for(d.rep_id, d.work_date) rr ON true
  LEFT JOIN LATERAL (
    SELECT count(*)::bigint AS bookings,
           count(*) FILTER (WHERE a.attribution = 'unresolved')::bigint AS unresolved
    FROM public.booking_rep_attribution a
    WHERE a.rep_id = d.rep_id AND a.booked_date = d.work_date
  ) b ON true
  ORDER BY d.work_date DESC, rep_name
$$;

-- =========================================================
-- 7. LABOUR ALLOCATED TO LOCATION OR AD
-- =========================================================
CREATE OR REPLACE FUNCTION public.labour_by_key(p_from date DEFAULT NULL, p_to date DEFAULT NULL, p_mode text DEFAULT 'location')
RETURNS TABLE(
  key text, hours numeric, hourly_cost numeric, hours_missing_rate numeric,
  hours_fallback numeric, bookings bigint, bonus_cost numeric, bonus_missing_rate bigint
)
LANGUAGE sql STABLE SET search_path = public AS $$
  WITH days AS (
    SELECT rc.rep_id, rc.work_date,
           COALESCE(o.hours, rc.calc_hours) AS hours,
           rr.hourly_rate
    FROM public.rep_call_days rc
    LEFT JOIN public.rep_hour_overrides o ON o.rep_id = rc.rep_id AND o.work_date = rc.work_date
    LEFT JOIN LATERAL public.rep_rate_for(rc.rep_id, rc.work_date) rr ON true
    WHERE (p_from IS NULL OR rc.work_date >= p_from)
      AND (p_to IS NULL OR rc.work_date <= p_to)
  ),
  parts AS (
    SELECT k.rep_id, k.work_date,
           CASE WHEN p_mode = 'ad' THEN k.ad_name ELSE k.location END AS key,
           sum(k.talk_secs) AS talk_secs, sum(k.leads) AS leads
    FROM public.rep_day_key_calls k
    WHERE (CASE WHEN p_mode = 'ad' THEN k.ad_name ELSE k.location END) IS NOT NULL
      AND (p_from IS NULL OR k.work_date >= p_from)
      AND (p_to IS NULL OR k.work_date <= p_to)
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
$$;

-- =========================================================
-- 8. REVENUE (shows only) BY LOCATION OR AD
-- =========================================================
CREATE OR REPLACE FUNCTION public.revenue_by_key(p_from date DEFAULT NULL, p_to date DEFAULT NULL, p_mode text DEFAULT 'location')
RETURNS TABLE(key text, shows bigint, revenue numeric)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT CASE WHEN p_mode = 'ad' THEN o.ad_name ELSE o.location END AS key,
         count(*)::bigint,
         sum(COALESCE(pc.price_per_booking, 800))
  FROM public.ad_lead_outcomes o
  JOIN public.clinic_appointments a ON a.id = o.appointment_id
  LEFT JOIN public.partner_clinics pc ON pc.id = a.clinic_id
  WHERE o.is_showed
    AND NOT o.unattributed
    AND (CASE WHEN p_mode = 'ad' THEN o.ad_name ELSE o.location END) IS NOT NULL
    AND (p_from IS NULL OR (o.created_at AT TIME ZONE 'Australia/Sydney')::date >= p_from)
    AND (p_to IS NULL OR (o.created_at AT TIME ZONE 'Australia/Sydney')::date <= p_to)
  GROUP BY 1
$$;

-- =========================================================
-- 9. MONTHLY MONEY BY LOCATION (chart)
-- =========================================================
CREATE OR REPLACE FUNCTION public.money_monthly(p_from date DEFAULT NULL, p_to date DEFAULT NULL)
RETURNS TABLE(month date, location text, spend numeric, showed bigint, revenue numeric, labour_cost numeric, bonus_cost numeric)
LANGUAGE sql STABLE SET search_path = public AS $$
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
  ),
  parts AS (
    SELECT k.rep_id, k.work_date, k.location AS key,
           sum(k.talk_secs) AS talk_secs, sum(k.leads) AS leads
    FROM public.rep_day_key_calls k
    WHERE k.location IS NOT NULL
      AND (p_from IS NULL OR k.work_date >= p_from) AND (p_to IS NULL OR k.work_date <= p_to)
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
$$;

GRANT SELECT ON public.rep_call_days TO authenticated;
GRANT SELECT ON public.rep_day_key_calls TO authenticated;
GRANT SELECT ON public.booking_rep_attribution TO authenticated;