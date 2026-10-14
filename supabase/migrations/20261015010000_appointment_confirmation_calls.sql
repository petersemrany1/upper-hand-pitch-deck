-- Manual confirmation activity is separate from booking, attendance and deposits.
CREATE TABLE IF NOT EXISTS public.appointment_confirmation_events (
  id uuid PRIMARY KEY,
  appointment_id uuid NOT NULL REFERENCES public.clinic_appointments(id) ON DELETE CASCADE,
  appointment_updated_at timestamptz NOT NULL,
  actor_id uuid NOT NULL, actor_name text NOT NULL,
  kind text NOT NULL CHECK(kind IN ('confirmed','no_answer','needs_help','sms')),
  note text CHECK(length(note)<=1000), created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  sms_body text, sms_phone text,
  sms_status text CHECK(sms_status IN ('pending','sending','accepted','failed','uncertain')),
  sms_sid text, sms_error text,
  CHECK((kind='sms' AND sms_body IS NOT NULL AND sms_phone IS NOT NULL AND sms_status IS NOT NULL)
    OR (kind<>'sms' AND sms_body IS NULL AND sms_phone IS NULL AND sms_status IS NULL))
);
CREATE INDEX IF NOT EXISTS confirmation_events_booking_idx ON public.appointment_confirmation_events(appointment_id,created_at DESC);
-- Reopening a composer or clicking Send in two tabs cannot send another copy.
CREATE UNIQUE INDEX IF NOT EXISTS confirmation_one_text_per_booking_version
  ON public.appointment_confirmation_events(appointment_id,appointment_updated_at) WHERE kind='sms';
ALTER TABLE public.appointment_confirmation_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sales read own confirmations" ON public.appointment_confirmation_events;
CREATE POLICY "sales read own confirmations" ON public.appointment_confirmation_events
  FOR SELECT TO authenticated USING(public.can_manage_booking(appointment_id));
REVOKE ALL ON public.appointment_confirmation_events FROM anon,authenticated;
GRANT SELECT ON public.appointment_confirmation_events TO authenticated;
GRANT ALL ON public.appointment_confirmation_events TO service_role;

-- The authenticated session supplies the actor. Lock the appointment so a
-- reschedule cannot slip between the version check and recording the outcome.
CREATE OR REPLACE FUNCTION public.record_appointment_confirmation(
  p_id uuid,p_request uuid,p_version timestamptz,p_kind text,p_note text DEFAULT NULL,p_body text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.clinic_appointments; actor record; old public.appointment_confirmation_events; phone text;
BEGIN
  SELECT s.id,s.role,r.name INTO actor FROM public.booking_sales_actor() s JOIN public.sales_reps r ON r.id=s.id;
  IF actor.id IS NULL OR NOT public.can_manage_booking(p_id) THEN RAISE EXCEPTION 'You do not have access to this booking'; END IF;
  SELECT * INTO a FROM public.clinic_appointments WHERE id=p_id FOR UPDATE;
  IF a.id IS NULL OR a.updated_at IS DISTINCT FROM p_version THEN RAISE EXCEPTION 'The booking changed. Refresh its details before confirming or texting.'; END IF;
  IF a.outcome IS NOT NULL OR a.disqualified_at IS NOT NULL
    OR a.appointment_date < (now() AT TIME ZONE 'Australia/Sydney')::date
    OR (a.appointment_date = (now() AT TIME ZONE 'Australia/Sydney')::date AND a.appointment_time::time <= (now() AT TIME ZONE 'Australia/Sydney')::time)
    OR NOT EXISTS(SELECT 1 FROM public.appointment_reminders r WHERE r.appointment_id=a.id AND r.status='confirmed')
    THEN RAISE EXCEPTION 'This appointment is no longer awaiting attendance'; END IF;
  IF p_kind NOT IN ('confirmed','no_answer','needs_help','sms') OR p_kind IS NULL THEN RAISE EXCEPTION 'Invalid confirmation outcome'; END IF;
  IF length(coalesce(p_note,''))>1000 THEN RAISE EXCEPTION 'Keep notes under 1000 characters'; END IF;
  SELECT * INTO old FROM public.appointment_confirmation_events WHERE id=p_request;
  IF FOUND THEN
    IF old.appointment_id<>p_id OR old.appointment_updated_at<>p_version OR old.kind<>p_kind
      OR (old.actor_id<>actor.id AND p_kind<>'sms') OR old.sms_body IS DISTINCT FROM (CASE WHEN p_kind='sms' THEN btrim(p_body) ELSE NULL END)
      OR old.note IS DISTINCT FROM nullif(btrim(p_note),'') THEN RAISE EXCEPTION 'Request already used'; END IF;
    RETURN old.id;
  END IF;
  IF p_kind='sms' THEN
    IF coalesce(length(btrim(p_body)),0)=0 OR length(p_body)>1600 THEN RAISE EXCEPTION 'Text must contain 1–1600 characters'; END IF;
    phone:=regexp_replace(coalesce(a.patient_phone,''),'[\s()\-]','','g');
    IF phone LIKE '0%' THEN phone:='+61'||substr(phone,2);
    ELSIF phone LIKE '61%' THEN phone:='+'||phone;
    ELSIF phone ~ '^[2-478][0-9]{8}$' THEN phone:='+61'||phone; END IF;
    IF phone !~ '^\+[1-9][0-9]{7,14}$' THEN RAISE EXCEPTION 'The patient needs a valid phone number'; END IF;
    SELECT * INTO old FROM public.appointment_confirmation_events WHERE appointment_id=p_id AND appointment_updated_at=p_version AND kind='sms';
    IF FOUND THEN RETURN old.id; END IF;
  END IF;
  INSERT INTO public.appointment_confirmation_events(id,appointment_id,appointment_updated_at,actor_id,actor_name,kind,note,sms_body,sms_phone,sms_status)
  VALUES(p_request,p_id,p_version,actor.id,coalesce(actor.name,'Team member'),p_kind,nullif(btrim(p_note),''),
    CASE WHEN p_kind='sms' THEN btrim(p_body) END,CASE WHEN p_kind='sms' THEN phone END,CASE WHEN p_kind='sms' THEN 'pending' END);
  RETURN p_request;
END $$;
REVOKE ALL ON FUNCTION public.record_appointment_confirmation(uuid,uuid,timestamptz,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_appointment_confirmation(uuid,uuid,timestamptz,text,text,text) TO authenticated;
