-- Dated clinic trials. Reps receive scheduling windows only, never trial terms.
BEGIN;
CREATE TABLE IF NOT EXISTS public.clinic_trials (
  clinic_id uuid PRIMARY KEY REFERENCES public.partner_clinics(id),
  booking_opens date NOT NULL,
  appointment_start date NOT NULL,
  appointment_end date NOT NULL,
  paid_started_at timestamptz,
  CHECK (booking_opens <= appointment_start AND appointment_start <= appointment_end)
);
ALTER TABLE public.clinic_trials ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.clinic_trials TO authenticated;
GRANT ALL ON public.clinic_trials TO service_role;
DROP POLICY IF EXISTS "Admin manages clinic trials" ON public.clinic_trials;
CREATE POLICY "Admin manages clinic trials" ON public.clinic_trials TO authenticated
  USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
DROP POLICY IF EXISTS "Clinic reads own trial" ON public.clinic_trials;
CREATE POLICY "Clinic reads own trial" ON public.clinic_trials FOR SELECT TO authenticated
  USING (public.is_clinic_user_for(clinic_id));

ALTER TABLE public.clinic_appointments ADD COLUMN IF NOT EXISTS is_free_trial boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.apply_clinic_trial()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.clinic_trials%ROWTYPE;
  today date := (statement_timestamp() AT TIME ZONE 'Australia/Sydney')::date;
BEGIN
  -- Only this trigger assigns the flag. A trial booking stays free on later
  -- updates/reschedules, even after the clinic buys a pack.
  IF TG_OP = 'UPDATE' AND NEW.clinic_id = OLD.clinic_id THEN
    NEW.is_free_trial := OLD.is_free_trial;
    IF OLD.is_free_trial OR NEW.appointment_date = OLD.appointment_date THEN RETURN NEW; END IF;
  ELSE
    NEW.is_free_trial := false;
  END IF;
  SELECT * INTO t FROM public.clinic_trials WHERE clinic_id = NEW.clinic_id;
  IF NOT FOUND OR t.paid_started_at IS NOT NULL THEN RETURN NEW; END IF;
  IF today < t.booking_opens OR today > t.appointment_end
     OR NEW.appointment_date < t.appointment_start OR NEW.appointment_date > t.appointment_end THEN
    RAISE EXCEPTION 'This clinic is not accepting new bookings for that date. Choose another available date or contact Admin.';
  END IF;
  NEW.is_free_trial := true;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.apply_clinic_trial() FROM PUBLIC;
DROP TRIGGER IF EXISTS apply_clinic_trial ON public.clinic_appointments;
CREATE TRIGGER apply_clinic_trial BEFORE INSERT OR UPDATE ON public.clinic_appointments
FOR EACH ROW EXECUTE FUNCTION public.apply_clinic_trial();

CREATE OR REPLACE FUNCTION public.start_clinic_paid_pack(p_clinic uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin_user() THEN RAISE EXCEPTION 'Admin access required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.clinic_packs WHERE clinic_id = p_clinic
    AND pack_type = 'paid' AND pack_size > 0 AND amount_paid_ex_gst > 0) THEN
    RAISE EXCEPTION 'Add the paid pack and amount paid before starting paid bookings.';
  END IF;
  UPDATE public.clinic_trials SET paid_started_at = COALESCE(paid_started_at, statement_timestamp()) WHERE clinic_id = p_clinic;
  IF NOT FOUND THEN RAISE EXCEPTION 'No trial configured for this clinic'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.start_clinic_paid_pack(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_clinic_paid_pack(uuid) TO authenticated, service_role;

INSERT INTO public.clinic_trials(clinic_id, booking_opens, appointment_start, appointment_end)
SELECT id, '2026-10-08', '2026-10-12', '2026-10-20'
FROM public.partner_clinics WHERE id = '6087e8f7-32c9-4d1e-a251-01fbfd36d830'
ON CONFLICT (clinic_id) DO NOTHING;

-- Dated trials never take a slot in a paid pack. Keep legacy trial accounting
-- unchanged for other clinics.
CREATE OR REPLACE VIEW public.clinic_show_slots WITH (security_invoker = true) AS
WITH slots AS (
  SELECT p.clinic_id, p.pack_type,
    row_number() OVER (PARTITION BY p.clinic_id ORDER BY COALESCE(p.date_paid,p.purchased_at::date),p.created_at,gs) AS slot_no
  FROM public.clinic_packs p CROSS JOIN generate_series(1,GREATEST(p.pack_size,0)) gs
), shows AS (
  SELECT a.id AS appointment_id,a.clinic_id,a.appointment_date,
    row_number() OVER (PARTITION BY a.clinic_id ORDER BY a.appointment_date,a.created_at) AS show_no
  FROM public.clinic_appointments a WHERE a.outcome IN ('show','proceeded')
    AND a.patient_name NOT ILIKE '%test%' AND NOT a.is_free_trial
)
SELECT s.appointment_id,s.clinic_id,s.appointment_date,s.show_no,sl.pack_type,
  (sl.pack_type IS NOT NULL AND sl.pack_type <> 'paid') AS is_free,(sl.pack_type IS NULL) AS unpurchased
FROM shows s LEFT JOIN slots sl ON sl.clinic_id=s.clinic_id AND sl.slot_no=s.show_no
UNION ALL
SELECT a.id,a.clinic_id,a.appointment_date,NULL::bigint,'dated_trial'::text,true,false
FROM public.clinic_appointments a WHERE a.is_free_trial AND a.outcome IN ('show','proceeded') AND a.patient_name NOT ILIKE '%test%';

CREATE OR REPLACE VIEW public.clinic_effective_rate WITH (security_invoker = true) AS
SELECT c.id AS clinic_id, COALESCE(pk.amount_paid,0::numeric) AS amount_paid_ex_gst,
  COALESCE(pk.shows_purchased,0::bigint) AS shows_purchased,
  COALESCE(sh.shows_delivered,0::bigint) AS shows_delivered,
  CASE WHEN GREATEST(COALESCE(pk.shows_purchased,0),COALESCE(sh.shows_delivered,0)) > 0
    THEN COALESCE(pk.amount_paid,0)/GREATEST(COALESCE(pk.shows_purchased,0),COALESCE(sh.shows_delivered,0))::numeric
    ELSE NULL::numeric END AS effective_rate,
  COALESCE(c.price_per_booking,800::numeric) AS list_rate
FROM public.partner_clinics c LEFT JOIN (
  SELECT clinic_id,sum(COALESCE(amount_paid_ex_gst,0)) AS amount_paid,sum(GREATEST(pack_size,0))::bigint AS shows_purchased
  FROM public.clinic_packs GROUP BY clinic_id
) pk ON pk.clinic_id=c.id LEFT JOIN (
  SELECT clinic_id,count(*) AS shows_delivered FROM public.clinic_show_slots
  WHERE pack_type IS DISTINCT FROM 'dated_trial' GROUP BY clinic_id
) sh ON sh.clinic_id=c.id;

-- Change only the trial treatment in existing report functions, retaining all
-- attribution rules and permissions. Fail rather than overwrite an unknown shape.
DO $$ DECLARE definition text; updated text;
BEGIN
  SELECT pg_get_functiondef('public.revenue_by_key(date,date,text)'::regprocedure) INTO definition;
  updated := replace(definition,'sum(COALESCE(er.effective_rate, 0))','sum(CASE WHEN a.is_free_trial THEN 0 ELSE COALESCE(er.effective_rate, 0) END)');
  updated := replace(updated,'sum(COALESCE(er.list_rate, 800))','sum(CASE WHEN a.is_free_trial THEN 0 ELSE COALESCE(er.list_rate, 800) END)');
  IF updated = definition AND position('a.is_free_trial' in definition) = 0 THEN RAISE EXCEPTION 'Unexpected revenue_by_key definition'; END IF;
  EXECUTE updated;
  SELECT pg_get_functiondef('public.money_monthly(date,date,uuid)'::regprocedure) INTO definition;
  updated := replace(definition,'WHEN o.is_showed THEN COALESCE(er.effective_rate, 0)','WHEN o.is_showed AND NOT COALESCE(a.is_free_trial, false) THEN COALESCE(er.effective_rate, 0)');
  IF updated = definition AND position('a.is_free_trial' in definition) = 0 THEN RAISE EXCEPTION 'Unexpected money_monthly definition'; END IF;
  EXECUTE updated;
  SELECT pg_get_functiondef('public.clinic_pack_economics()'::regprocedure) INTO definition;
  updated := replace(definition,'count(*)::bigint AS shows_delivered','count(*) FILTER (WHERE s.pack_type IS DISTINCT FROM ''dated_trial'')::bigint AS shows_delivered');
  IF updated = definition AND position('dated_trial' in definition) = 0 THEN RAISE EXCEPTION 'Unexpected clinic_pack_economics definition'; END IF;
  EXECUTE updated;
END $$;
COMMIT;
