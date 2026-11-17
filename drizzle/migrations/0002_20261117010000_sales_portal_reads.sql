-- Return a single consistent balance snapshot without transferring appointment
-- rows. The sales identity check is the same one used by the server endpoint.
CREATE OR REPLACE FUNCTION public.sales_capacity_snapshot()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.booking_sales_actor()) THEN
    RAISE EXCEPTION 'Sales access required' USING ERRCODE = '42501';
  END IF;
  RETURN (
    WITH packs AS (
      SELECT clinic_id, pack_type, pack_size, coalesce(date_paid, (purchased_at AT TIME ZONE 'UTC')::date) AS paid_date
      FROM public.clinic_packs
    ), last_trials AS (
      SELECT clinic_id, max(paid_date) AS last_date FROM packs WHERE pack_type = 'free_trial' GROUP BY clinic_id
    ), balances AS (
      SELECT p.clinic_id, coalesce(sum(p.pack_size) FILTER (WHERE p.pack_type IS DISTINCT FROM 'free_trial'), 0) AS bought,
        CASE WHEN t.last_date IS NOT NULL THEN coalesce(min(p.paid_date) FILTER (
          WHERE p.pack_type IS DISTINCT FROM 'free_trial' AND p.paid_date >= t.last_date
        ), (now() AT TIME ZONE 'Australia/Sydney')::date) END AS cutoff
      FROM packs p LEFT JOIN last_trials t USING (clinic_id) GROUP BY p.clinic_id,t.last_date
    ), used AS (
      SELECT a.clinic_id, count(*) AS booked FROM public.clinic_appointments a
      LEFT JOIN balances b USING (clinic_id)
      WHERE a.disqualified_at IS NULL AND a.outcome IS DISTINCT FROM 'noshow' AND a.outcome IS DISTINCT FROM 'disqualified'
        AND a.patient_name NOT ILIKE '%test%' AND a.patient_name NOT ILIKE '%demo%'
        AND a.is_free_trial IS NOT TRUE
        AND (b.cutoff IS NULL OR a.booked_at IS NULL OR (a.booked_at AT TIME ZONE 'Australia/Sydney')::date > b.cutoff)
      GROUP BY a.clinic_id
    )
    SELECT jsonb_build_object(
      'clinics', coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'location', c.location, 'city', c.city)
        ORDER BY c.id) FILTER (WHERE c.is_active), '[]'::jsonb),
      'remaining', coalesce(jsonb_object_agg(c.id, CASE WHEN EXISTS (
        SELECT 1 FROM public.clinic_trials t WHERE t.clinic_id=c.id AND t.paid_started_at IS NULL
      ) THEN 1 ELSE coalesce(b.bought,0)-coalesce(u.booked,0) END), '{}'::jsonb)
    ) FROM public.partner_clinics c LEFT JOIN balances b ON b.clinic_id=c.id LEFT JOIN used u ON u.clinic_id=c.id
  );
END $$;
REVOKE ALL ON FUNCTION public.sales_capacity_snapshot() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sales_capacity_snapshot() TO authenticated, service_role;

-- Invoker reads retain call_records RLS. Emit one summary for every requested
-- lead, including explicit zeroes. A JSON scalar avoids the REST row cap.
CREATE OR REPLACE FUNCTION public.sales_queue_history(p_leads uuid[], p_today timestamptz, p_since timestamptz, p_zone text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  WITH ids AS (SELECT DISTINCT unnest(p_leads) AS id), calls AS (
    SELECT c.lead_id,c.id,c.called_at,c.direction IS DISTINCT FROM 'inbound' AS dial,coalesce(c.outcome,c.status) AS outcome
    FROM public.call_records c JOIN ids ON ids.id=c.lead_id WHERE c.called_at IS NOT NULL
  ), totals AS (
    SELECT lead_id, count(*) FILTER (WHERE dial) AS attempts, min(called_at) AS first_call,
      max(called_at) FILTER (WHERE dial) AS last_dial, count(*) FILTER (WHERE dial AND called_at >= p_today) AS today,
      min(called_at) FILTER (WHERE called_at >= p_today) AS first_today,
      max(called_at) FILTER (WHERE dial AND called_at >= p_today) AS last_today
    FROM calls GROUP BY lead_id
  ), daily AS (
    SELECT lead_id, (called_at AT TIME ZONE p_zone)::date AS day, count(*) FILTER (WHERE dial) AS count,
      (array_agg(outcome ORDER BY called_at DESC,id DESC) FILTER (WHERE outcome IS NOT NULL))[1] AS last_outcome
    FROM calls WHERE called_at >= p_since GROUP BY lead_id,(called_at AT TIME ZONE p_zone)::date
  ), days AS (
    SELECT lead_id,jsonb_object_agg(day,jsonb_build_object('count',count,'lastOutcome',last_outcome)) AS by_day
    FROM daily GROUP BY lead_id
  )
  SELECT coalesce(jsonb_object_agg(ids.id,jsonb_build_object(
    'attempts',coalesce(t.attempts,0),'firstCallAt',t.first_call,'lastAttemptAt',t.last_dial,
    'todayAttempts',coalesce(t.today,0),'todayFirstAttemptAt',t.first_today,'todayLastAttemptAt',t.last_today,
    'days',coalesce(d.by_day,'{}'::jsonb)
  )), '{}'::jsonb) FROM ids LEFT JOIN totals t ON t.lead_id=ids.id LEFT JOIN days d ON d.lead_id=ids.id
$$;
REVOKE ALL ON FUNCTION public.sales_queue_history(uuid[],timestamptz,timestamptz,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sales_queue_history(uuid[],timestamptz,timestamptz,text) TO authenticated, service_role;

-- The existing row's owner is already available. Resolve the caller once per
-- statement instead of running can_manage_booking(id) and re-reading each row.
-- clinic_portal_users.id is its primary key. Keep the original WITH CHECK.
ALTER POLICY "appointment owner or own clinic" ON public.clinic_appointments USING (
  EXISTS (SELECT 1 FROM public.booking_sales_actor() s WHERE s.role='admin')
  OR booking_rep_id IN (SELECT s.id FROM public.booking_sales_actor() s)
  OR clinic_id = (SELECT public.current_clinic_id())
);
ALTER POLICY "clinic select own appts" ON public.clinic_appointments
  USING (clinic_id = (SELECT public.current_clinic_id()));
