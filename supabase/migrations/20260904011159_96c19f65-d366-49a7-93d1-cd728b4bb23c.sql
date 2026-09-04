CREATE OR REPLACE FUNCTION public.dashboard_conversion_stats(p_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_rep uuid DEFAULT NULL::uuid)
 RETURNS TABLE(leads_total bigint, leads_booked bigint, connected_unique bigint, connected_booked bigint, convos_unique bigint, convos_booked bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  WITH clean_leads AS (
    SELECT id, created_at, rep_id
    FROM public.meta_leads
    WHERE NOT (lower(coalesce(first_name,'')) = 'peter' AND lower(coalesce(last_name,'')) LIKE 'test%')
      AND lower(coalesce(first_name,'')) <> 'test'
      AND lower(coalesce(last_name,'')) <> 'test'
      AND (p_rep IS NULL OR rep_id = p_rep)
  ),
  period_leads AS (
    SELECT * FROM clean_leads
    WHERE p_from IS NULL OR created_at >= p_from
  ),
  -- Every booking EVENT (not lead status), same sources the leaderboard uses.
  booking_events AS (
    SELECT lead_id, booked_at FROM public.clinic_appointments WHERE lead_id IS NOT NULL
    UNION ALL
    SELECT lead_id, booked_at FROM public.appointment_reminders
      WHERE lead_id IS NOT NULL AND coalesce(status,'') <> 'cancelled'
  ),
  booked_in_window AS (
    SELECT DISTINCT lead_id FROM booking_events
    WHERE p_from IS NULL OR booked_at >= p_from
  ),
  booked_ever AS (
    SELECT DISTINCT lead_id FROM booking_events
  ),
  -- Dedupe dials per lead; classify once on the aggregate, matching the
  -- leaderboard: reached = manual "connected" outcome OR (not a failed status
  -- AND >= 15s); convo = max duration >= 120s.
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
$function$;