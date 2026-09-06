DROP FUNCTION IF EXISTS public.dashboard_conversion_stats(timestamp with time zone, uuid);

CREATE OR REPLACE FUNCTION public.dashboard_conversion_stats(p_from timestamp with time zone, p_rep uuid, p_city text DEFAULT NULL)
RETURNS TABLE(leads_total bigint, leads_booked bigint, connected_unique bigint, connected_booked bigint, convos_unique bigint, convos_booked bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH clean_leads AS (
    SELECT id, created_at, rep_id, status, deposit_paid_at
    FROM public.meta_leads
    WHERE NOT (lower(coalesce(first_name,'')) = 'peter' AND lower(coalesce(last_name,'')) LIKE 'test%')
      AND lower(coalesce(first_name,'')) <> 'test'
      AND lower(coalesce(last_name,'')) <> 'test'
      AND (p_rep IS NULL OR rep_id = p_rep)
      AND (
        p_city IS NULL
        OR lower(coalesce((SELECT pc.city FROM public.partner_clinics pc WHERE pc.id = clinic_id), '')) = lower(p_city)
      )
  ),
  period_leads AS (
    SELECT * FROM clean_leads
    WHERE p_from IS NULL OR created_at >= p_from
  ),
  booking_events AS (
    SELECT l.id AS lead_id,
           coalesce(
             l.deposit_paid_at,
             (SELECT min(a.booked_at) FROM public.clinic_appointments a WHERE a.lead_id = l.id),
             (SELECT min(r.booked_at) FROM public.appointment_reminders r WHERE r.lead_id = l.id AND coalesce(r.status,'') <> 'cancelled')
           ) AS booked_at
    FROM public.meta_leads l
    WHERE l.status = 'booked_deposit_paid' OR l.deposit_paid_at IS NOT NULL
  ),
  booked_in_window AS (
    SELECT DISTINCT lead_id FROM booking_events
    WHERE booked_at IS NOT NULL AND (p_from IS NULL OR booked_at >= p_from)
  ),
  booked_ever AS (
    SELECT DISTINCT lead_id FROM booking_events
  ),
  calls AS (
    SELECT lead_id,
           max(coalesce(duration, duration_seconds, 0)) AS max_duration,
           bool_or(
             coalesce(outcome,'') = 'connected'
             OR (coalesce(status,'') NOT IN ('no-answer','busy','failed','canceled')
                 AND coalesce(duration, duration_seconds, 0) >= 15)
           ) AS reached
    FROM public.call_records
    WHERE lead_id IS NOT NULL
      AND direction = 'outbound'
      AND coalesce(status,'') NOT IN ('ringing','initiated','queued','in-progress')
      AND (p_from IS NULL OR called_at >= p_from)
      AND (p_rep IS NULL OR rep_id = p_rep)
    GROUP BY lead_id
  ),
  joined AS (
    SELECT c.lead_id, c.max_duration, c.reached
    FROM calls c
    JOIN clean_leads l ON l.id = c.lead_id
  )
  SELECT
    (SELECT count(*) FROM period_leads),
    (SELECT count(*) FROM period_leads p WHERE EXISTS (SELECT 1 FROM booked_ever b WHERE b.lead_id = p.id)),
    (SELECT count(*) FROM joined WHERE reached),
    (SELECT count(*) FROM joined j WHERE j.reached AND EXISTS (SELECT 1 FROM booked_in_window b WHERE b.lead_id = j.lead_id)),
    (SELECT count(*) FROM joined WHERE reached AND max_duration >= 120),
    (SELECT count(*) FROM joined j WHERE j.reached AND j.max_duration >= 120 AND EXISTS (SELECT 1 FROM booked_in_window b WHERE b.lead_id = j.lead_id));
$$;

GRANT EXECUTE ON FUNCTION public.dashboard_conversion_stats(timestamp with time zone, uuid, text) TO authenticated;