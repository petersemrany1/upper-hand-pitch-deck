-- 1. Location helper: identical logic to the leads page location chip.
CREATE OR REPLACE FUNCTION public.ad_location_from_campaign(p_campaign text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT NULLIF(trim(regexp_replace(COALESCE(p_campaign, ''), '^hair\s+transplant\s+', '', 'i')), '')
$$;

-- 2. Spend table
CREATE TABLE public.ad_spend_daily (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL,
  ad_id text,
  ad_name text NOT NULL,
  adset_name text,
  campaign_name text,
  location text,
  spend_aud numeric NOT NULL DEFAULT 0,
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'meta',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ad_spend_daily_date_ad_key
  ON public.ad_spend_daily (date, COALESCE(ad_id, ad_name));
CREATE INDEX ad_spend_daily_ad_name_idx ON public.ad_spend_daily (lower(ad_name));
CREATE INDEX ad_spend_daily_date_idx ON public.ad_spend_daily (date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_spend_daily TO authenticated;
GRANT ALL ON public.ad_spend_daily TO service_role;

ALTER TABLE public.ad_spend_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read ad spend"
  ON public.ad_spend_daily FOR SELECT TO authenticated
  USING (public.is_admin_user() OR public.current_sales_rep_id() IS NOT NULL);

CREATE POLICY "Admins can insert ad spend"
  ON public.ad_spend_daily FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_user());

CREATE POLICY "Admins can update ad spend"
  ON public.ad_spend_daily FOR UPDATE TO authenticated
  USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

CREATE POLICY "Admins can delete ad spend"
  ON public.ad_spend_daily FOR DELETE TO authenticated
  USING (public.is_admin_user());

CREATE TRIGGER ad_spend_daily_updated_at
  BEFORE UPDATE ON public.ad_spend_daily
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Sync state
CREATE TABLE public.ad_spend_sync_state (
  id integer NOT NULL PRIMARY KEY DEFAULT 1,
  last_synced_at timestamp with time zone,
  last_status text,
  last_message text,
  rows_upserted integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ad_spend_sync_state_single_row CHECK (id = 1)
);

GRANT SELECT ON public.ad_spend_sync_state TO authenticated;
GRANT ALL ON public.ad_spend_sync_state TO service_role;

ALTER TABLE public.ad_spend_sync_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read spend sync state"
  ON public.ad_spend_sync_state FOR SELECT TO authenticated
  USING (public.is_admin_user() OR public.current_sales_rep_id() IS NOT NULL);

CREATE TRIGGER ad_spend_sync_state_updated_at
  BEFORE UPDATE ON public.ad_spend_sync_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.ad_spend_sync_state (id) VALUES (1);

-- 4. Per-lead outcome view (read only; never writes to meta_leads)
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
  public.ad_location_from_campaign(l.campaign_name) AS location,
  (NULLIF(trim(l.ad_name), '') IS NULL OR NULLIF(trim(l.campaign_name), '') IS NULL) AS unattributed,
  f.appointment_id, f.appointment_date, f.appointment_time, f.outcome,
  (f.appointment_id IS NOT NULL AND COALESCE(f.outcome, '') <> 'disqualified') AS is_booked,
  (f.outcome = 'disqualified') AS is_disqualified,
  (f.outcome = 'show') AS is_showed,
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

GRANT SELECT ON public.ad_lead_outcomes TO authenticated;
GRANT SELECT ON public.ad_lead_outcomes TO service_role;

-- 5. Per-ad performance
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
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH spend AS (
    SELECT lower(s.ad_name) AS k, min(s.ad_name) AS ad_name,
           min(COALESCE(s.location, public.ad_location_from_campaign(s.campaign_name))) AS location,
           sum(s.spend_aud) AS spend, sum(s.impressions)::bigint AS impressions,
           sum(s.clicks)::bigint AS clicks
    FROM public.ad_spend_daily s
    WHERE (p_from IS NULL OR s.date >= p_from)
      AND (p_to IS NULL OR s.date <= p_to)
      AND (p_location IS NULL
           OR lower(COALESCE(s.location, public.ad_location_from_campaign(s.campaign_name))) = lower(p_location))
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

REVOKE ALL ON FUNCTION public.ad_performance(date, date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ad_performance(date, date, text) TO authenticated, service_role;

-- 6. Per-location summary
CREATE OR REPLACE FUNCTION public.ad_location_summary(
  p_from date DEFAULT NULL,
  p_to date DEFAULT NULL
)
RETURNS TABLE(
  location text, spend numeric, leads bigint, booked bigint, showed bigint,
  noshow bigint, upcoming bigint, needs_outcome bigint, disqualified bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    WHERE NOT o.unattributed
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

REVOKE ALL ON FUNCTION public.ad_location_summary(date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ad_location_summary(date, date) TO authenticated, service_role;

-- 7. Cost per show by month, per location
CREATE OR REPLACE FUNCTION public.ad_cost_per_show_monthly(
  p_from date DEFAULT NULL,
  p_to date DEFAULT NULL
)
RETURNS TABLE(month date, location text, spend numeric, showed bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    WHERE NOT o.unattributed
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

REVOKE ALL ON FUNCTION public.ad_cost_per_show_monthly(date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ad_cost_per_show_monthly(date, date) TO authenticated, service_role;