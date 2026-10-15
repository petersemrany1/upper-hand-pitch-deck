-- Internal sales callbacks do not alter appointments, reminders, leads or deposits.
CREATE TABLE IF NOT EXISTS public.appointment_confirmation_callbacks (
  id uuid PRIMARY KEY,
  appointment_id uuid NOT NULL REFERENCES public.clinic_appointments(id) ON DELETE CASCADE,
  appointment_updated_at timestamptz NOT NULL,
  replaces_id uuid REFERENCES public.appointment_confirmation_callbacks(id),
  callback_date date NOT NULL,
  callback_time time,
  note text CHECK(length(note)<=1000),
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','replaced','done','rescheduled','confirmed')),
  actor_id uuid NOT NULL, actor_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  completed_at timestamptz, completed_by uuid,
  CHECK(callback_time IS NULL OR (callback_time < time '24:00' AND extract(second FROM callback_time)=0))
);
CREATE UNIQUE INDEX IF NOT EXISTS confirmation_callback_one_pending
  ON public.appointment_confirmation_callbacks(appointment_id) WHERE status='pending';
CREATE INDEX IF NOT EXISTS confirmation_callback_due
  ON public.appointment_confirmation_callbacks(callback_date,callback_time) WHERE status='pending';
ALTER TABLE public.appointment_confirmation_callbacks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sales read own callbacks" ON public.appointment_confirmation_callbacks;
CREATE POLICY "sales read own callbacks" ON public.appointment_confirmation_callbacks
  FOR SELECT TO authenticated USING(public.can_manage_booking(appointment_id));
REVOKE ALL ON public.appointment_confirmation_callbacks FROM anon,authenticated;
GRANT SELECT ON public.appointment_confirmation_callbacks TO authenticated;
GRANT ALL ON public.appointment_confirmation_callbacks TO service_role;

CREATE OR REPLACE FUNCTION public.schedule_confirmation_callback(
  p_id uuid,p_request uuid,p_version timestamptz,p_expected uuid,p_date date,p_time time,p_note text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.clinic_appointments; actor record; old public.appointment_confirmation_callbacks;
  pending_id uuid; local_now timestamp := now() AT TIME ZONE 'Australia/Sydney';
BEGIN
  SELECT s.id,r.name INTO actor FROM public.booking_sales_actor() s JOIN public.sales_reps r ON r.id=s.id;
  IF actor.id IS NULL OR NOT public.can_manage_booking(p_id) THEN RAISE EXCEPTION 'You do not have access to this booking'; END IF;
  SELECT * INTO a FROM public.clinic_appointments WHERE id=p_id FOR UPDATE;
  -- A lost response can be retried safely, even if the booking subsequently changes.
  SELECT * INTO old FROM public.appointment_confirmation_callbacks WHERE id=p_request;
  IF FOUND THEN
    IF old.appointment_id IS DISTINCT FROM p_id OR old.appointment_updated_at IS DISTINCT FROM p_version
      OR old.actor_id IS DISTINCT FROM actor.id OR old.replaces_id IS DISTINCT FROM p_expected
      OR old.callback_date IS DISTINCT FROM p_date OR old.callback_time IS DISTINCT FROM p_time
      OR old.note IS DISTINCT FROM nullif(btrim(p_note),'') THEN RAISE EXCEPTION 'Request already used'; END IF;
    RETURN old.id;
  END IF;
  IF a.id IS NULL OR a.updated_at IS DISTINCT FROM p_version THEN RAISE EXCEPTION 'The booking changed. Refresh before scheduling a callback.'; END IF;
  IF p_date IS NULL OR p_date < local_now::date OR (p_date=local_now::date AND p_time IS NOT NULL AND p_time<=local_now::time)
    OR p_time>=time '24:00' OR extract(second FROM p_time)<>0 THEN RAISE EXCEPTION 'Choose a callback date and time in the future (Sydney time)'; END IF;
  IF length(coalesce(p_note,''))>1000 THEN RAISE EXCEPTION 'Keep notes under 1000 characters'; END IF;
  SELECT id INTO pending_id FROM public.appointment_confirmation_callbacks WHERE appointment_id=p_id AND status='pending';
  IF pending_id IS DISTINCT FROM p_expected THEN RAISE EXCEPTION 'The callback changed. Refresh before saving.'; END IF;
  UPDATE public.appointment_confirmation_callbacks SET status='replaced',completed_at=clock_timestamp(),completed_by=actor.id WHERE id=pending_id;
  INSERT INTO public.appointment_confirmation_callbacks(id,appointment_id,appointment_updated_at,replaces_id,callback_date,callback_time,note,actor_id,actor_name)
    VALUES(p_request,p_id,p_version,p_expected,p_date,p_time,nullif(btrim(p_note),''),actor.id,coalesce(actor.name,'Team member'));
  RETURN p_request;
END $$;

CREATE OR REPLACE FUNCTION public.complete_confirmation_callback(p_id uuid,p_callback uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_actor_id uuid; old public.appointment_confirmation_callbacks;
BEGIN
  SELECT id INTO v_actor_id FROM public.booking_sales_actor();
  IF v_actor_id IS NULL OR NOT public.can_manage_booking(p_id) THEN RAISE EXCEPTION 'You do not have access to this booking'; END IF;
  PERFORM 1 FROM public.clinic_appointments WHERE id=p_id FOR UPDATE;
  SELECT * INTO old FROM public.appointment_confirmation_callbacks WHERE id=p_callback AND appointment_id=p_id;
  IF old.id IS NULL OR old.status='replaced' THEN RAISE EXCEPTION 'The callback changed. Refresh before marking it done.'; END IF;
  UPDATE public.appointment_confirmation_callbacks SET status='done',completed_at=clock_timestamp(),completed_by=v_actor_id
    WHERE id=p_callback AND status='pending';
END $$;

-- A genuine reschedule closes its pending callback in the same transaction.
-- Notes, attendance updates and other booking edits do not dismiss callbacks.
CREATE OR REPLACE FUNCTION public.close_rescheduled_confirmation_callback()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF (NEW.appointment_date,NEW.appointment_time,NEW.clinic_id) IS DISTINCT FROM (OLD.appointment_date,OLD.appointment_time,OLD.clinic_id) THEN
    UPDATE public.appointment_confirmation_callbacks SET status='rescheduled',completed_at=clock_timestamp()
      WHERE appointment_id=NEW.id AND status='pending';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS close_rescheduled_confirmation_callback ON public.clinic_appointments;
CREATE TRIGGER close_rescheduled_confirmation_callback AFTER UPDATE OF appointment_date,appointment_time,clinic_id
  ON public.clinic_appointments FOR EACH ROW EXECUTE FUNCTION public.close_rescheduled_confirmation_callback();

CREATE OR REPLACE FUNCTION public.close_confirmed_confirmation_callback()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.kind='confirmed' THEN
    UPDATE public.appointment_confirmation_callbacks SET status='confirmed',completed_at=clock_timestamp(),completed_by=NEW.actor_id
      WHERE appointment_id=NEW.appointment_id AND status='pending';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS close_confirmed_confirmation_callback ON public.appointment_confirmation_events;
CREATE TRIGGER close_confirmed_confirmation_callback AFTER INSERT ON public.appointment_confirmation_events
  FOR EACH ROW EXECUTE FUNCTION public.close_confirmed_confirmation_callback();
REVOKE ALL ON FUNCTION public.close_rescheduled_confirmation_callback(),public.close_confirmed_confirmation_callback() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.schedule_confirmation_callback(uuid,uuid,timestamptz,uuid,date,time,text),public.complete_confirmation_callback(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.schedule_confirmation_callback(uuid,uuid,timestamptz,uuid,date,time,text),public.complete_confirmation_callback(uuid,uuid) TO authenticated;
