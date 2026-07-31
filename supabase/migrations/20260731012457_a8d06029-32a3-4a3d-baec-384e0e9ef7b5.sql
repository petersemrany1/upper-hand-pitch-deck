-- 1. New columns
ALTER TABLE public.meta_leads
  ADD COLUMN IF NOT EXISTS lead_class text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS lead_class_reason text,
  ADD COLUMN IF NOT EXISTS superseded_by_lead_id uuid;

CREATE INDEX IF NOT EXISTS meta_leads_lead_class_idx ON public.meta_leads (lead_class);
CREATE INDEX IF NOT EXISTS meta_leads_email_lower_idx ON public.meta_leads (lower(email));
CREATE INDEX IF NOT EXISTS meta_leads_phone_tail_idx ON public.meta_leads (right(public.normalize_phone(phone), 9));

-- 2. Layered matcher: meta lead id OR exact email OR last-9 phone digits
CREATE OR REPLACE FUNCTION public.meta_lead_prior_id(_id uuid, _phone text, _email text, _meta_lead_id text)
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT m.id
  FROM public.meta_leads m
  WHERE m.id IS DISTINCT FROM _id
    AND (
      (_meta_lead_id IS NOT NULL AND m.lead_id = _meta_lead_id)
      OR (NULLIF(trim(_email), '') IS NOT NULL AND lower(m.email) = lower(trim(_email)))
      OR (
        length(public.normalize_phone(_phone)) >= 9
        AND length(public.normalize_phone(m.phone)) >= 9
        AND right(public.normalize_phone(m.phone), 9) = right(public.normalize_phone(_phone), 9)
      )
    )
  ORDER BY m.created_at DESC
  LIMIT 1
$$;

-- 3. Classifier
CREATE OR REPLACE FUNCTION public.meta_lead_classify(_prior uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_status text;
  v_last_appt date;
  v_today date := (now() AT TIME ZONE 'Australia/Sydney')::date;
BEGIN
  IF _prior IS NULL THEN
    RETURN 'new';
  END IF;

  SELECT status INTO v_status FROM public.meta_leads WHERE id = _prior;
  SELECT max(appointment_date) INTO v_last_appt
    FROM public.clinic_appointments WHERE lead_id = _prior;

  IF v_last_appt IS NOT NULL OR v_status = 'booked_deposit_paid' THEN
    IF v_last_appt IS NOT NULL AND v_last_appt >= v_today THEN
      RETURN 'booked_active';
    END IF;
    RETURN 'post_consult';
  END IF;

  RETURN 'returning';
END;
$$;

-- 4. Classify on insert
CREATE OR REPLACE FUNCTION public.meta_lead_set_class()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_prior uuid;
  v_class text;
  v_prior_status text;
BEGIN
  v_prior := COALESCE(NEW.previous_lead_id, public.meta_lead_prior_id(NEW.id, NEW.phone, NEW.email, NEW.lead_id));
  NEW.previous_lead_id := v_prior;
  v_class := public.meta_lead_classify(v_prior);
  NEW.lead_class := v_class;

  IF v_prior IS NOT NULL THEN
    SELECT status INTO v_prior_status FROM public.meta_leads WHERE id = v_prior;
    NEW.lead_class_reason := CASE v_class
      WHEN 'booked_active' THEN 'Already booked with an upcoming appointment'
      WHEN 'post_consult' THEN 'Has already attended a consult'
      ELSE 'Enquired before - last outcome: ' || COALESCE(v_prior_status, 'unknown')
    END;
  ELSE
    NEW.lead_class_reason := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_meta_lead_set_class ON public.meta_leads;
CREATE TRIGGER trg_meta_lead_set_class
BEFORE INSERT ON public.meta_leads
FOR EACH ROW EXECUTE FUNCTION public.meta_lead_set_class();

-- 5. Sweep sibling duplicates when one gets booked
CREATE OR REPLACE FUNCTION public.meta_lead_close_siblings(_booked uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_phone text;
  v_email text;
  v_count integer := 0;
BEGIN
  SELECT phone, email INTO v_phone, v_email FROM public.meta_leads WHERE id = _booked;
  IF NOT FOUND THEN RETURN 0; END IF;

  WITH closed AS (
    UPDATE public.meta_leads s
    SET status = 'dropped',
        superseded_by_lead_id = _booked,
        call_notes = COALESCE(NULLIF(s.call_notes, '') || E'\n\n', '')
          || 'Auto-closed: this person booked under another enquiry on '
          || to_char((now() AT TIME ZONE 'Australia/Sydney')::date, 'DD Mon YYYY') || '.',
        updated_at = now()
    WHERE s.id <> _booked
      AND s.status NOT IN ('booked_deposit_paid', 'dropped', 'intake', 'no_show', 'cancelled')
      AND s.superseded_by_lead_id IS NULL
      AND (
        (NULLIF(trim(v_email), '') IS NOT NULL AND lower(s.email) = lower(trim(v_email)))
        OR (
          length(public.normalize_phone(v_phone)) >= 9
          AND length(public.normalize_phone(s.phone)) >= 9
          AND right(public.normalize_phone(s.phone), 9) = right(public.normalize_phone(v_phone), 9)
        )
      )
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM closed;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.meta_lead_booked_sweep()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'booked_deposit_paid' AND COALESCE(OLD.status, '') IS DISTINCT FROM 'booked_deposit_paid' THEN
    PERFORM public.meta_lead_close_siblings(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_meta_lead_booked_sweep ON public.meta_leads;
CREATE TRIGGER trg_meta_lead_booked_sweep
AFTER UPDATE ON public.meta_leads
FOR EACH ROW EXECUTE FUNCTION public.meta_lead_booked_sweep();

CREATE OR REPLACE FUNCTION public.appointment_lead_sweep()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.lead_id IS NOT NULL THEN
    PERFORM public.meta_lead_close_siblings(NEW.lead_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_appointment_lead_sweep ON public.clinic_appointments;
CREATE TRIGGER trg_appointment_lead_sweep
AFTER INSERT ON public.clinic_appointments
FOR EACH ROW EXECUTE FUNCTION public.appointment_lead_sweep();