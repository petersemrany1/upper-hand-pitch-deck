CREATE OR REPLACE FUNCTION public.dashboard_conversion_stats(p_from timestamp with time zone, p_rep uuid, p_city text DEFAULT NULL)
RETURNS TABLE(leads_total bigint, leads_booked bigint, connected_unique bigint, connected_booked bigint, convos_unique bigint, convos_booked bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH clean_leads AS (
    SELECT id, created_at, rep_id
    FROM public.meta_leads
    WHERE NOT (lower(coalesce(first_name,'')) = 'peter' AND lower(coalesce(last_name,'')) LIKE 'test%')
      AND lower(coalesce(first_name,'')) <> 'test'
      AND lower(coalesce(last_name,'')) <> 'test'
      AND lower(coalesce(campaign_name,'')) NOT LIKE 'test%'
      AND (p_rep IS NULL OR rep_id = p_rep)
      AND (
        p_city IS NULL
        OR lower(coalesce(campaign_name,'')) LIKE '%' || lower(p_city) || '%'
      )
  ),
  booking_events AS (
    SELECT l.id AS lead_id,
           LEAST(
             coalesce((SELECT min(a.booked_at) FROM public.clinic_appointments a WHERE a.lead_id = l.id), 'infinity'),
             coalesce(l.deposit_paid_at, 'infinity'),
             coalesce((SELECT min(r.booked_at) FROM public.appointment_reminders r
                        WHERE r.lead_id = l.id AND coalesce(r.status,'') <> 'cancelled'), 'infinity')
           ) AS booked_at
    FROM public.meta_leads l
  ),
  bookings AS (
    SELECT lead_id, booked_at FROM booking_events WHERE booked_at <> 'infinity'
  ),
  period_leads AS (
    SELECT * FROM clean_leads
    WHERE p_from IS NULL OR created_at >= p_from
  ),
  calls AS (
    SELECT lead_id, max(coalesce(duration, duration_seconds, 0)) AS max_duration
    FROM public.call_records
    WHERE lead_id IS NOT NULL
      AND direction = 'outbound'
      AND coalesce(status,'') NOT IN ('ringing','initiated','queued','in-progress','twiml-issued')
      AND (p_from IS NULL OR called_at >= p_from)
      AND (p_rep IS NULL OR rep_id = p_rep)
    GROUP BY lead_id
  ),
  joined AS (
    SELECT c.lead_id, c.max_duration
    FROM calls c
    JOIN clean_leads l ON l.id = c.lead_id
  )
  SELECT
    (SELECT count(*) FROM period_leads),
    (SELECT count(*) FROM period_leads p WHERE EXISTS (SELECT 1 FROM bookings b WHERE b.lead_id = p.id)),
    (SELECT count(*) FROM joined WHERE max_duration >= 15),
    (SELECT count(*) FROM joined j WHERE j.max_duration >= 15
       AND EXISTS (SELECT 1 FROM bookings b WHERE b.lead_id = j.lead_id AND (p_from IS NULL OR b.booked_at >= p_from))),
    (SELECT count(*) FROM joined WHERE max_duration >= 60),
    (SELECT count(*) FROM joined j WHERE j.max_duration >= 60
       AND EXISTS (SELECT 1 FROM bookings b WHERE b.lead_id = j.lead_id AND (p_from IS NULL OR b.booked_at >= p_from)));
$$;

GRANT EXECUTE ON FUNCTION public.dashboard_conversion_stats(timestamp with time zone, uuid, text) TO authenticated;