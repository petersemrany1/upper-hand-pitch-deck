-- Repeat enquiries retain their own history, but never become another sale.
-- Follow explicit links so a third enquiry still finds the original booking.
CREATE OR REPLACE FUNCTION public.meta_lead_booking_owner(_prior uuid)
RETURNS uuid LANGUAGE sql STABLE SET search_path = public AS $$
  WITH RECURSIVE lineage AS (
    SELECT m.id, m.previous_lead_id, m.superseded_by_lead_id, m.status,
           ARRAY[m.id] AS visited, 0 AS depth
    FROM public.meta_leads m WHERE m.id = _prior
    UNION ALL
    SELECT m.id, m.previous_lead_id, m.superseded_by_lead_id, m.status,
           l.visited || m.id, l.depth + 1
    FROM lineage l JOIN public.meta_leads m
      ON m.id = COALESCE(l.superseded_by_lead_id, l.previous_lead_id)
    WHERE NOT m.id = ANY(l.visited)
  )
  SELECT l.id FROM lineage l
  WHERE l.status = 'booked_deposit_paid'
     OR EXISTS (SELECT 1 FROM public.clinic_appointments a WHERE a.lead_id = l.id)
  ORDER BY l.depth LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.meta_lead_booking_owner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.meta_lead_booking_owner(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.meta_lead_classify(_prior uuid)
RETURNS text LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE
  v_owner uuid;
  v_status text;
  v_last_appt date;
  v_today date := (now() AT TIME ZONE 'Australia/Sydney')::date;
BEGIN
  IF _prior IS NULL THEN RETURN 'new'; END IF;
  v_owner := public.meta_lead_booking_owner(_prior);
  IF v_owner IS NULL THEN RETURN 'returning'; END IF;
  SELECT status INTO v_status FROM public.meta_leads WHERE id = v_owner;
  SELECT max(appointment_date) INTO v_last_appt
    FROM public.clinic_appointments WHERE lead_id = v_owner;
  -- Preserve the established booking/past-consult classification rules.
  IF v_last_appt IS NOT NULL OR v_status = 'booked_deposit_paid' THEN
    IF v_last_appt >= v_today THEN RETURN 'booked_active'; END IF;
    RETURN 'post_consult';
  END IF;
  RETURN 'returning';
END;
$$;

CREATE OR REPLACE FUNCTION public.retain_booked_repeat_enquiry()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid;
BEGIN
  IF NEW.lead_class NOT IN ('booked_active', 'post_consult')
     OR NEW.status IN ('blacklisted', 'cancelled', 'no_show', 'on_hold')
     OR NEW.status = 'booked_deposit_paid' OR NEW.deposit_paid_at IS NOT NULL
     OR NEW.stripe_payment_intent_id IS NOT NULL
     OR EXISTS (SELECT 1 FROM public.clinic_appointments a WHERE a.lead_id = NEW.id)
  THEN RETURN NEW; END IF;
  v_owner := public.meta_lead_booking_owner(COALESCE(NEW.superseded_by_lead_id, NEW.previous_lead_id));
  IF v_owner IS NOT NULL AND v_owner <> NEW.id THEN
    NEW.status := 'dropped';
    NEW.superseded_by_lead_id := v_owner;
    NEW.callback_scheduled_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.retain_booked_repeat_enquiry() FROM PUBLIC;
-- Runs after trg_meta_lead_set_class; keep the existing blacklist trigger.
CREATE OR REPLACE TRIGGER zzz_retain_booked_repeat_enquiry BEFORE INSERT ON public.meta_leads
  FOR EACH ROW EXECUTE FUNCTION public.retain_booked_repeat_enquiry();

-- Repair only verified, unpaid duplicate rows, preserving bookings/payments.
WITH duplicates AS (
  SELECT l.id, public.meta_lead_booking_owner(COALESCE(l.superseded_by_lead_id,l.previous_lead_id)) AS owner_id
  FROM public.meta_leads l
  WHERE l.lead_class = 'booked_active'
    AND l.status IS DISTINCT FROM 'booked_deposit_paid'
    AND COALESCE(l.status, '') NOT IN ('blacklisted', 'cancelled', 'no_show', 'on_hold')
    AND l.deposit_paid_at IS NULL AND l.stripe_payment_intent_id IS NULL
    AND NOT EXISTS (SELECT 1 FROM public.clinic_appointments a WHERE a.lead_id=l.id)
)
UPDATE public.meta_leads l
SET status='dropped', superseded_by_lead_id=d.owner_id, callback_scheduled_at=NULL,
    lead_class=public.meta_lead_classify(d.owner_id), updated_at=now()
FROM duplicates d
WHERE l.id=d.id AND d.owner_id IS NOT NULL AND d.owner_id<>l.id
  AND (l.status IS DISTINCT FROM 'dropped' OR l.superseded_by_lead_id IS DISTINCT FROM d.owner_id
    OR l.callback_scheduled_at IS NOT NULL OR l.lead_class IS DISTINCT FROM public.meta_lead_classify(d.owner_id));
