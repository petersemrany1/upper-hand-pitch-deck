CREATE OR REPLACE FUNCTION public.dashboard_conversion_stats(p_from timestamptz DEFAULT NULL, p_rep uuid DEFAULT NULL)
RETURNS TABLE (
  leads_total bigint,
  leads_booked bigint,
  connected_unique bigint,
  connected_booked bigint,
  convos_unique bigint,
  convos_booked bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH clean_leads AS (
    SELECT id, status, created_at, rep_id
    FROM public.meta_leads
    WHERE coalesce(first_name, '') NOT ILIKE '%test%'
      AND coalesce(last_name, '') NOT ILIKE '%test%'
      AND (p_rep IS NULL OR rep_id = p_rep)
  ),
  period_leads AS (
    SELECT * FROM clean_leads
    WHERE p_from IS NULL OR created_at >= p_from
  ),
  calls AS (
    SELECT lead_id, max(duration) AS max_duration
    FROM public.call_records
    WHERE lead_id IS NOT NULL
      AND status = 'completed'
      AND direction = 'outbound'
      AND duration >= 10
      AND (p_from IS NULL OR called_at >= p_from)
      AND (p_rep IS NULL OR rep_id = p_rep)
    GROUP BY lead_id
  ),
  joined AS (
    SELECT c.lead_id, c.max_duration, l.status
    FROM calls c
    JOIN clean_leads l ON l.id = c.lead_id
  )
  SELECT
    (SELECT count(*) FROM period_leads),
    (SELECT count(*) FROM period_leads WHERE status = 'booked_deposit_paid'),
    (SELECT count(*) FROM joined),
    (SELECT count(*) FROM joined WHERE status = 'booked_deposit_paid'),
    (SELECT count(*) FROM joined WHERE max_duration >= 120),
    (SELECT count(*) FROM joined WHERE max_duration >= 120 AND status = 'booked_deposit_paid');
$$;

GRANT EXECUTE ON FUNCTION public.dashboard_conversion_stats(timestamptz, uuid) TO authenticated;

CREATE INDEX IF NOT EXISTS call_records_conv_idx ON public.call_records (called_at DESC) WHERE lead_id IS NOT NULL AND status = 'completed' AND direction = 'outbound';