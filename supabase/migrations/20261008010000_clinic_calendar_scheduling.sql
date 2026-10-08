-- Approval preview only: apply at the approved release, never to test the UI.
-- Consultation length is independent of the existing 15-minute start interval.
ALTER TABLE public.partner_clinics ADD COLUMN IF NOT EXISTS consultation_duration_minutes integer;
ALTER TABLE public.partner_clinics ADD COLUMN IF NOT EXISTS buffer_minutes integer;
UPDATE public.partner_clinics SET
 consultation_duration_minutes = CASE WHEN id='9ac8fa05-c4b0-4faa-b519-f6a347956fb1' THEN 90 ELSE 30 END,
 buffer_minutes = CASE WHEN id='9ac8fa05-c4b0-4faa-b519-f6a347956fb1' THEN 30 ELSE greatest(coalesce(min_appointment_gap_mins,0),0) END
WHERE consultation_duration_minutes IS NULL;
ALTER TABLE public.partner_clinics ALTER COLUMN consultation_duration_minutes SET DEFAULT 30;
ALTER TABLE public.partner_clinics ALTER COLUMN consultation_duration_minutes SET NOT NULL;
ALTER TABLE public.partner_clinics ALTER COLUMN buffer_minutes SET DEFAULT 0;
ALTER TABLE public.partner_clinics ALTER COLUMN buffer_minutes SET NOT NULL;
ALTER TABLE public.partner_clinics DROP CONSTRAINT IF EXISTS clinic_consultation_length_valid;
ALTER TABLE public.partner_clinics ADD CONSTRAINT clinic_consultation_length_valid CHECK (consultation_duration_minutes BETWEEN 5 AND 240);
ALTER TABLE public.partner_clinics DROP CONSTRAINT IF EXISTS clinic_buffer_valid;
ALTER TABLE public.partner_clinics ADD CONSTRAINT clinic_buffer_valid CHECK (buffer_minutes BETWEEN 0 AND 180);

DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clinic_appointments' AND column_name='consultation_duration_minutes') THEN
   ALTER TABLE public.clinic_appointments ADD COLUMN consultation_duration_minutes integer NOT NULL DEFAULT 30;
   -- Deb's existing consultations already last 90 minutes. Never move their times.
   UPDATE public.clinic_appointments SET consultation_duration_minutes=90
   WHERE clinic_id='9ac8fa05-c4b0-4faa-b519-f6a347956fb1';
 END IF;
END $$;
ALTER TABLE public.clinic_appointments DROP CONSTRAINT IF EXISTS booked_consultation_length_valid;
ALTER TABLE public.clinic_appointments ADD CONSTRAINT booked_consultation_length_valid CHECK (consultation_duration_minutes BETWEEN 5 AND 240);
ALTER TABLE public.clinic_blocked_slots ADD COLUMN IF NOT EXISTS excluded_dates date[] NOT NULL DEFAULT '{}';
-- Older calendars stored closures as 'blocked'. Read both names and keep
-- their rows intact while allowing the editor's explicit 'closed' value.
ALTER TABLE public.clinic_availability DROP CONSTRAINT IF EXISTS clinic_availability_override_type_check;
ALTER TABLE public.clinic_availability ADD CONSTRAINT clinic_availability_override_type_check CHECK (override_type IN ('blocked','closed','open'));

CREATE TABLE IF NOT EXISTS public.clinic_public_holidays (
 state text NOT NULL, holiday_date date NOT NULL, name text NOT NULL,
 PRIMARY KEY(state,holiday_date)
);
ALTER TABLE public.clinic_public_holidays ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.clinic_public_holidays FROM anon,authenticated;
GRANT ALL ON public.clinic_public_holidays TO service_role;

CREATE OR REPLACE FUNCTION public.schedule_minute(p_time text)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path=public AS $$
 SELECT (extract(epoch FROM p_time::time)/60)::integer
$$;
CREATE OR REPLACE FUNCTION public.schedule_state(p_state text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path=public AS $$
 SELECT CASE upper(btrim(p_state)) WHEN 'NEW SOUTH WALES' THEN 'NSW' WHEN 'VICTORIA' THEN 'VIC'
 WHEN 'QUEENSLAND' THEN 'QLD' WHEN 'SOUTH AUSTRALIA' THEN 'SA' WHEN 'WESTERN AUSTRALIA' THEN 'WA'
 WHEN 'TASMANIA' THEN 'TAS' WHEN 'NORTHERN TERRITORY' THEN 'NT' WHEN 'AUSTRALIAN CAPITAL TERRITORY' THEN 'ACT'
 ELSE upper(btrim(p_state)) END
$$;
CREATE OR REPLACE FUNCTION public.schedule_block_matches(b public.clinic_blocked_slots,p_day date)
RETURNS boolean LANGUAGE sql STABLE SET search_path=public AS $$
 SELECT CASE WHEN NOT coalesce(b.is_recurring,false) THEN b.slot_date=p_day ELSE
 NOT (p_day=ANY(coalesce(b.excluded_dates,'{}'))) AND (b.slot_date IS NULL OR p_day>=b.slot_date)
 AND (b.recur_until IS NULL OR p_day<=b.recur_until)
 AND CASE coalesce(b.recur_pattern,'weekly')
 WHEN 'daily' THEN true
 WHEN 'weekly' THEN ((extract(isodow FROM p_day)::integer-1)=ANY(CASE WHEN cardinality(b.recur_days_of_week)>0 THEN b.recur_days_of_week ELSE ARRAY[b.recur_day_of_week] END))
 WHEN 'monthly_date' THEN extract(day FROM p_day)::integer=b.recur_day_of_month
 WHEN 'monthly_nth_dow' THEN extract(isodow FROM p_day)::integer-1=b.recur_day_of_week
   AND CASE WHEN b.recur_nth_week=5 THEN extract(month FROM p_day+7)<>extract(month FROM p_day)
     ELSE ((extract(day FROM p_day)::integer-1)/7)+1=b.recur_nth_week END
 ELSE false END END
$$;
CREATE OR REPLACE FUNCTION public.schedule_hours(p_clinic uuid,p_day date)
RETURNS TABLE(opens integer,closes integer,step integer) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE t public.clinic_trading_hours; o public.clinic_availability; st text;
BEGIN
 SELECT * INTO t FROM public.clinic_trading_hours WHERE clinic_id=p_clinic AND day_of_week=extract(isodow FROM p_day)::integer-1;
 SELECT * INTO o FROM public.clinic_availability WHERE clinic_id=p_clinic AND override_date=p_day;
 IF o.override_type IN ('blocked','closed') THEN RETURN; END IF;
 IF o.override_type='open' AND o.start_time IS NOT NULL AND o.end_time IS NOT NULL THEN
   RETURN QUERY SELECT public.schedule_minute(o.start_time::text),public.schedule_minute(o.end_time::text),coalesce(t.consult_duration_mins,15); RETURN;
 END IF;
 SELECT public.schedule_state(state) INTO st FROM public.partner_clinics WHERE id=p_clinic;
 IF EXISTS(SELECT 1 FROM public.clinic_public_holidays WHERE state=st AND holiday_date=p_day) THEN RETURN; END IF;
 IF t.id IS NULL OR t.is_closed THEN RETURN; END IF;
 RETURN QUERY SELECT public.schedule_minute(t.open_time::text),public.schedule_minute(t.close_time::text),coalesce(t.consult_duration_mins,15);
END $$;

CREATE OR REPLACE FUNCTION public.guard_booking_slot()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.partner_clinics; h record; starts integer; finishes integer; gap integer;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.clinic_id::text,0));
 SELECT * INTO c FROM public.partner_clinics WHERE id=NEW.clinic_id;
 IF c.id IS NULL THEN RAISE EXCEPTION 'Clinic not found'; END IF;
 IF TG_OP='INSERT' THEN NEW.consultation_duration_minutes:=c.consultation_duration_minutes;
 ELSIF NEW.clinic_id IS DISTINCT FROM OLD.clinic_id THEN NEW.consultation_duration_minutes:=c.consultation_duration_minutes;
 ELSIF NEW.consultation_duration_minutes IS DISTINCT FROM OLD.consultation_duration_minutes AND NOT (coalesce(current_setting('app.confirmed_duration_clinic',true),'')=NEW.clinic_id::text AND NEW.consultation_duration_minutes=c.consultation_duration_minutes AND NEW.appointment_date=OLD.appointment_date AND NEW.appointment_time=OLD.appointment_time AND NEW.clinic_id=OLD.clinic_id) THEN
   RAISE EXCEPTION 'An existing appointment keeps its booked consultation length';
 END IF;
 IF TG_OP='UPDATE' AND NEW.appointment_date=OLD.appointment_date AND NEW.appointment_time::time=OLD.appointment_time::time AND NEW.clinic_id=OLD.clinic_id THEN RETURN NEW; END IF;
 IF NEW.appointment_date < (now() AT TIME ZONE 'Australia/Sydney')::date OR
   (NEW.appointment_date=(now() AT TIME ZONE 'Australia/Sydney')::date AND NEW.appointment_time::time <= (now() AT TIME ZONE 'Australia/Sydney')::time)
 THEN RAISE EXCEPTION 'Choose a future appointment time'; END IF;
 SELECT * INTO h FROM public.schedule_hours(NEW.clinic_id,NEW.appointment_date);
 starts:=public.schedule_minute(NEW.appointment_time); finishes:=starts+NEW.consultation_duration_minutes; gap:=c.buffer_minutes;
 IF h.opens IS NULL OR h.step<1 OR starts<h.opens OR finishes>h.closes OR mod(starts-h.opens,h.step)<>0 THEN
   RAISE EXCEPTION 'That appointment does not fit within working hours. Choose another time.';
 END IF;
 IF EXISTS(SELECT 1 FROM public.clinic_blocked_slots b WHERE b.clinic_id=NEW.clinic_id AND public.schedule_block_matches(b,NEW.appointment_date)
   AND starts<public.schedule_minute(b.slot_end::text) AND finishes>public.schedule_minute(b.slot_start::text)) THEN
   RAISE EXCEPTION 'That appointment would run into blocked time. Choose another time.';
 END IF;
 IF EXISTS(SELECT 1 FROM public.clinic_appointments a WHERE a.clinic_id=NEW.clinic_id AND a.id<>NEW.id AND a.appointment_date=NEW.appointment_date
   AND public.schedule_minute(a.appointment_time)<finishes+gap
   AND public.schedule_minute(a.appointment_time)+a.consultation_duration_minutes+gap>starts) THEN
   RAISE EXCEPTION 'That time was just taken or overlaps another appointment or buffer. Choose another time.';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS booking_slot_guard ON public.clinic_appointments;
CREATE TRIGGER booking_slot_guard BEFORE INSERT OR UPDATE OF appointment_date,appointment_time,clinic_id,consultation_duration_minutes
ON public.clinic_appointments FOR EACH ROW EXECUTE FUNCTION public.guard_booking_slot();

CREATE OR REPLACE FUNCTION public.sync_clinic_schedule_settings()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.id::text,0));
 -- Keep old browser tabs conservative until they refresh to the new picker.
 NEW.min_appointment_gap_mins:=greatest(NEW.consultation_duration_minutes+NEW.buffer_minutes-30,0);
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS clinic_schedule_settings_guard ON public.partner_clinics;
CREATE TRIGGER clinic_schedule_settings_guard BEFORE INSERT OR UPDATE OF consultation_duration_minutes,buffer_minutes
ON public.partner_clinics FOR EACH ROW EXECUTE FUNCTION public.sync_clinic_schedule_settings();

-- Covers direct clients as well as the atomic editor RPC. Deferral lets a
-- multi-row edit be checked against its final state, rather than intermediate rows.
CREATE OR REPLACE FUNCTION public.protect_booked_time()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE clinic uuid; day date; a public.clinic_appointments; b public.clinic_blocked_slots; h record; starts integer; finishes integer;
BEGIN
 clinic:=CASE WHEN TG_OP='DELETE' THEN OLD.clinic_id ELSE NEW.clinic_id END;
 IF TG_TABLE_NAME='clinic_blocked_slots' THEN
   IF TG_OP='DELETE' THEN RETURN NULL; END IF;
   SELECT * INTO b FROM public.clinic_blocked_slots WHERE id=NEW.id;
   IF NOT FOUND THEN RETURN NULL; END IF;
   FOR a IN SELECT * FROM public.clinic_appointments WHERE clinic_id=clinic AND appointment_date >= (now() AT TIME ZONE 'Australia/Sydney')::date LOOP
     IF public.schedule_block_matches(b,a.appointment_date) AND public.schedule_minute(a.appointment_time)<public.schedule_minute(b.slot_end::text)
       AND public.schedule_minute(a.appointment_time)+a.consultation_duration_minutes>public.schedule_minute(b.slot_start::text)
     THEN RAISE EXCEPTION 'A patient is already booked on % at %. Keep their appointment free.',a.appointment_date,a.appointment_time; END IF;
   END LOOP;
 ELSE
   FOR a IN SELECT * FROM public.clinic_appointments WHERE clinic_id=clinic AND appointment_date >= (now() AT TIME ZONE 'Australia/Sydney')::date LOOP
     IF TG_TABLE_NAME='clinic_availability' THEN
       day:=CASE WHEN TG_OP='DELETE' THEN OLD.override_date ELSE NEW.override_date END;
       IF a.appointment_date<>day THEN CONTINUE; END IF;
     ELSE
       IF extract(isodow FROM a.appointment_date)::integer-1<>(CASE WHEN TG_OP='DELETE' THEN OLD.day_of_week ELSE NEW.day_of_week END) THEN CONTINUE; END IF;
     END IF;
     SELECT * INTO h FROM public.schedule_hours(clinic,a.appointment_date);
     starts:=public.schedule_minute(a.appointment_time); finishes:=starts+a.consultation_duration_minutes;
     IF h.opens IS NULL OR starts<h.opens OR finishes>h.closes THEN
       RAISE EXCEPTION 'A patient is already booked on % at %. Keep their full appointment within working hours.',a.appointment_date,a.appointment_time;
     END IF;
   END LOOP;
 END IF;
 RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS protect_booked_blocks ON public.clinic_blocked_slots;
CREATE CONSTRAINT TRIGGER protect_booked_blocks AFTER INSERT OR UPDATE OR DELETE ON public.clinic_blocked_slots DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.protect_booked_time();
DROP TRIGGER IF EXISTS protect_booked_hours ON public.clinic_trading_hours;
CREATE CONSTRAINT TRIGGER protect_booked_hours AFTER INSERT OR UPDATE OR DELETE ON public.clinic_trading_hours DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.protect_booked_time();
DROP TRIGGER IF EXISTS protect_booked_overrides ON public.clinic_availability;
CREATE CONSTRAINT TRIGGER protect_booked_overrides AFTER INSERT OR UPDATE OR DELETE ON public.clinic_availability DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.protect_booked_time();

CREATE OR REPLACE FUNCTION public.clinic_schedule_snapshot(p_clinic uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object(
  'clinic_id',c.id,'clinic_name',c.clinic_name,'state',c.state,
  'consultation_minutes',c.consultation_duration_minutes,'buffer_minutes',c.buffer_minutes,
  'trading',coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.day_of_week) FROM public.clinic_trading_hours t WHERE t.clinic_id=c.id),'[]'),
  'blocks',coalesce((SELECT jsonb_agg(to_jsonb(b) ORDER BY b.id) FROM public.clinic_blocked_slots b WHERE b.clinic_id=c.id),'[]'),
  'overrides',coalesce((SELECT jsonb_agg(to_jsonb(o) ORDER BY o.override_date) FROM public.clinic_availability o WHERE o.clinic_id=c.id),'[]'),
  'appointments',coalesce((SELECT jsonb_agg(jsonb_build_object('id',a.id,'appointment_date',a.appointment_date,'appointment_time',a.appointment_time,'consultation_duration_minutes',a.consultation_duration_minutes) ORDER BY a.id) FROM public.clinic_appointments a WHERE a.clinic_id=c.id),'[]')
 ) FROM public.partner_clinics c WHERE c.id=p_clinic
$$;
CREATE OR REPLACE FUNCTION public.get_clinic_schedule(p_clinic uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb;
BEGIN
 IF NOT (coalesce(auth.role(),'')='service_role' OR public.is_clinic_user_for(p_clinic) OR EXISTS(SELECT 1 FROM public.booking_sales_actor())) THEN RAISE EXCEPTION 'You do not have access to this calendar'; END IF;
 result:=public.clinic_schedule_snapshot(p_clinic);
 IF result IS NULL THEN RAISE EXCEPTION 'Clinic not found'; END IF;
 RETURN result||jsonb_build_object('version',md5(result::text));
END $$;

CREATE OR REPLACE FUNCTION public.save_clinic_schedule(p_clinic uuid,p_version text,p_command jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE snapshot jsonb; item jsonb; day date; first_day date; dates jsonb; action text; starts time; finishes time;
 duration integer; buffer integer; block public.clinic_blocked_slots; cfg jsonb; old public.clinic_availability;
BEGIN
 IF NOT (coalesce(auth.role(),'')='service_role' OR public.is_clinic_user_for(p_clinic) OR EXISTS(SELECT 1 FROM public.booking_sales_actor() WHERE role='admin')) THEN RAISE EXCEPTION 'Only this clinic or an administrator can edit its calendar'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_clinic::text,0));
 snapshot:=public.clinic_schedule_snapshot(p_clinic);
 IF snapshot IS NULL THEN RAISE EXCEPTION 'Clinic not found'; END IF;
 IF md5(snapshot::text) IS DISTINCT FROM p_version THEN RAISE EXCEPTION 'This calendar changed while you were editing. Refresh and try again.'; END IF;
 action:=p_command->>'action';
 IF action='settings' THEN
   duration:=(p_command->>'consultation_minutes')::integer; buffer:=(p_command->>'buffer_minutes')::integer;
   IF duration IS NULL OR buffer IS NULL OR duration NOT BETWEEN 5 AND 240 OR buffer NOT BETWEEN 0 AND 180 THEN RAISE EXCEPTION 'Choose valid consultation and buffer lengths'; END IF;
   UPDATE public.partner_clinics SET consultation_duration_minutes=duration,buffer_minutes=buffer WHERE id=p_clinic;
   cfg:=p_command;
   IF cfg ? 'trading' THEN
     IF jsonb_typeof(cfg->'trading') IS DISTINCT FROM 'array' OR jsonb_array_length(cfg->'trading')<>7 OR (SELECT count(DISTINCT (value->>'day_of_week')::integer) FROM jsonb_array_elements(cfg->'trading'))<>7 THEN RAISE EXCEPTION 'Set operating hours for all seven days'; END IF;
     FOR item IN SELECT * FROM jsonb_array_elements(cfg->'trading') LOOP
       IF (item->>'day_of_week')::integer NOT BETWEEN 0 AND 6 OR item->>'day_of_week' IS NULL OR item->>'is_closed' IS NULL THEN RAISE EXCEPTION 'Invalid operating day'; END IF;
       starts:=(item->>'open_time')::time; finishes:=(item->>'close_time')::time;
       IF starts IS NULL OR finishes IS NULL OR (NOT (item->>'is_closed')::boolean AND starts>=finishes) THEN RAISE EXCEPTION 'Choose an end time after the start time'; END IF;
       INSERT INTO public.clinic_trading_hours(clinic_id,day_of_week,open_time,close_time,is_closed,consult_duration_mins)
       VALUES(p_clinic,(item->>'day_of_week')::integer,starts,finishes,(item->>'is_closed')::boolean,coalesce((item->>'consult_duration_mins')::integer,30))
       ON CONFLICT(clinic_id,day_of_week) DO UPDATE SET open_time=excluded.open_time,close_time=excluded.close_time,is_closed=excluded.is_closed
       WHERE (clinic_trading_hours.open_time,clinic_trading_hours.close_time,clinic_trading_hours.is_closed) IS DISTINCT FROM (excluded.open_time,excluded.close_time,excluded.is_closed);
     END LOOP;
   END IF;
   IF coalesce((p_command->>'apply_to_existing')::boolean,false) THEN
     PERFORM set_config('app.confirmed_duration_clinic',p_clinic::text,true);
     UPDATE public.clinic_appointments SET consultation_duration_minutes=duration WHERE clinic_id=p_clinic AND consultation_duration_minutes IS DISTINCT FROM duration;
     PERFORM set_config('app.confirmed_duration_clinic','',true);
   END IF;
 ELSIF action IN ('block','hours') THEN
   dates:=p_command->'dates';
   IF jsonb_typeof(dates) IS DISTINCT FROM 'array' OR jsonb_array_length(dates) NOT BETWEEN 1 AND 366 THEN RAISE EXCEPTION 'Choose valid dates'; END IF;
   first_day:=(dates->>0)::date;
   starts:=(p_command->>'start')::time; finishes:=(p_command->>'end')::time;
   IF NOT (action='hours' AND coalesce((p_command->>'closed')::boolean,false)) AND (starts IS NULL OR finishes IS NULL OR starts>=finishes) THEN RAISE EXCEPTION 'Choose an end time after the start time'; END IF;
   IF action='block' AND p_command->>'id' IS NOT NULL THEN
     SELECT * INTO block FROM public.clinic_blocked_slots WHERE id=(p_command->>'id')::uuid AND clinic_id=p_clinic;
     IF NOT FOUND THEN RAISE EXCEPTION 'This block has changed. Refresh and try again.'; END IF;
     IF block.is_recurring AND p_command->>'scope'='series' THEN
       UPDATE public.clinic_blocked_slots SET slot_start=starts,slot_end=finishes WHERE id=block.id;
       SET CONSTRAINTS protect_booked_blocks IMMEDIATE;
       RETURN public.get_clinic_schedule(p_clinic);
     ELSIF block.is_recurring THEN
       UPDATE public.clinic_blocked_slots SET excluded_dates=ARRAY(SELECT DISTINCT d FROM unnest(excluded_dates||ARRAY(SELECT value::date FROM jsonb_array_elements_text(dates))) AS d) WHERE id=block.id;
     ELSE DELETE FROM public.clinic_blocked_slots WHERE id=block.id; END IF;
   END IF;
   FOR item IN SELECT * FROM jsonb_array_elements(dates) LOOP
     day:=(item#>>'{}')::date;
     IF day IS NULL OR first_day IS NULL OR day>first_day+365 OR day<first_day THEN RAISE EXCEPTION 'Choose dates within the next year'; END IF;
     IF action='block' THEN
       INSERT INTO public.clinic_blocked_slots(clinic_id,slot_date,slot_start,slot_end,is_recurring,recur_day_of_week)
       VALUES(p_clinic,day,starts,finishes,false,null);
     ELSE
       SELECT * INTO old FROM public.clinic_availability WHERE clinic_id=p_clinic AND override_date=day;
       IF day<>first_day AND (old.override_type IN ('blocked','closed') OR (coalesce(old.override_type,'')<>'open' AND EXISTS(SELECT 1 FROM public.clinic_public_holidays h JOIN public.partner_clinics c ON c.id=p_clinic WHERE h.state=public.schedule_state(c.state) AND h.holiday_date=day))) THEN CONTINUE; END IF;
       INSERT INTO public.clinic_availability(clinic_id,override_date,override_type,start_time,end_time)
       VALUES(p_clinic,day,CASE WHEN (p_command->>'closed')::boolean THEN 'closed' ELSE 'open' END,
         CASE WHEN (p_command->>'closed')::boolean THEN null ELSE starts END,CASE WHEN (p_command->>'closed')::boolean THEN null ELSE finishes END)
       ON CONFLICT(clinic_id,override_date) DO UPDATE SET override_type=excluded.override_type,start_time=excluded.start_time,end_time=excluded.end_time;
     END IF;
   END LOOP;
 ELSIF action='unblock' THEN
   SELECT * INTO block FROM public.clinic_blocked_slots WHERE id=(p_command->>'id')::uuid AND clinic_id=p_clinic;
   IF NOT FOUND THEN RAISE EXCEPTION 'This block has changed. Refresh and try again.'; END IF;
   IF block.is_recurring AND p_command->>'scope'='date' THEN
     IF p_command->>'date' IS NULL THEN RAISE EXCEPTION 'Choose a valid date'; END IF;
     UPDATE public.clinic_blocked_slots SET excluded_dates=ARRAY(SELECT DISTINCT d FROM unnest(excluded_dates||ARRAY[(p_command->>'date')::date]) d) WHERE id=block.id;
   ELSE DELETE FROM public.clinic_blocked_slots WHERE id=block.id; END IF;
 ELSIF action='restore' THEN
   cfg:=p_command->'configuration';
   IF jsonb_typeof(cfg->'blocks') IS DISTINCT FROM 'array' OR jsonb_typeof(cfg->'overrides') IS DISTINCT FROM 'array' OR jsonb_array_length(cfg->'blocks')>5000 OR jsonb_array_length(cfg->'overrides')>5000 THEN RAISE EXCEPTION 'Invalid undo data'; END IF;
   UPDATE public.partner_clinics SET consultation_duration_minutes=(cfg->>'consultation_minutes')::integer,buffer_minutes=(cfg->>'buffer_minutes')::integer WHERE id=p_clinic;

   IF cfg ? 'trading' THEN
     IF jsonb_typeof(cfg->'trading') IS DISTINCT FROM 'array' OR jsonb_array_length(cfg->'trading')<>7 OR (SELECT count(DISTINCT (value->>'day_of_week')::integer) FROM jsonb_array_elements(cfg->'trading'))<>7 THEN RAISE EXCEPTION 'Set operating hours for all seven days'; END IF;
     FOR item IN SELECT * FROM jsonb_array_elements(cfg->'trading') LOOP
       IF (item->>'day_of_week')::integer NOT BETWEEN 0 AND 6 OR item->>'day_of_week' IS NULL OR item->>'is_closed' IS NULL THEN RAISE EXCEPTION 'Invalid operating day'; END IF;
       starts:=(item->>'open_time')::time; finishes:=(item->>'close_time')::time;
       IF starts IS NULL OR finishes IS NULL OR (NOT (item->>'is_closed')::boolean AND starts>=finishes) THEN RAISE EXCEPTION 'Choose an end time after the start time'; END IF;
       INSERT INTO public.clinic_trading_hours(clinic_id,day_of_week,open_time,close_time,is_closed,consult_duration_mins)
       VALUES(p_clinic,(item->>'day_of_week')::integer,starts,finishes,(item->>'is_closed')::boolean,coalesce((item->>'consult_duration_mins')::integer,30))
       ON CONFLICT(clinic_id,day_of_week) DO UPDATE SET open_time=excluded.open_time,close_time=excluded.close_time,is_closed=excluded.is_closed
       WHERE (clinic_trading_hours.open_time,clinic_trading_hours.close_time,clinic_trading_hours.is_closed) IS DISTINCT FROM (excluded.open_time,excluded.close_time,excluded.is_closed);
     END LOOP;
   END IF;
   DELETE FROM public.clinic_blocked_slots WHERE clinic_id=p_clinic AND id NOT IN (SELECT (value->>'id')::uuid FROM jsonb_array_elements(cfg->'blocks'));
   FOR item IN SELECT * FROM jsonb_array_elements(cfg->'blocks') LOOP
     INSERT INTO public.clinic_blocked_slots(id,clinic_id,slot_date,slot_start,slot_end,is_recurring,recur_day_of_week,recur_pattern,recur_days_of_week,recur_day_of_month,recur_nth_week,recur_until,excluded_dates)
     VALUES((item->>'id')::uuid,p_clinic,(item->>'slot_date')::date,(item->>'slot_start')::time,(item->>'slot_end')::time,(item->>'is_recurring')::boolean,(item->>'recur_day_of_week')::integer,item->>'recur_pattern',
       ARRAY(SELECT value::integer FROM jsonb_array_elements_text(coalesce(nullif(item->'recur_days_of_week','null'::jsonb),'[]'))),(item->>'recur_day_of_month')::integer,(item->>'recur_nth_week')::integer,(item->>'recur_until')::date,
       ARRAY(SELECT value::date FROM jsonb_array_elements_text(coalesce(nullif(item->'excluded_dates','null'::jsonb),'[]'))))
     ON CONFLICT(id) DO UPDATE SET slot_date=excluded.slot_date,slot_start=excluded.slot_start,slot_end=excluded.slot_end,is_recurring=excluded.is_recurring,recur_day_of_week=excluded.recur_day_of_week,recur_pattern=excluded.recur_pattern,
       recur_days_of_week=excluded.recur_days_of_week,recur_day_of_month=excluded.recur_day_of_month,recur_nth_week=excluded.recur_nth_week,recur_until=excluded.recur_until,excluded_dates=excluded.excluded_dates
     WHERE clinic_blocked_slots.clinic_id=p_clinic AND (to_jsonb(clinic_blocked_slots)-'created_at') IS DISTINCT FROM (to_jsonb(excluded)-'created_at');
     IF NOT EXISTS(SELECT 1 FROM public.clinic_blocked_slots WHERE id=(item->>'id')::uuid AND clinic_id=p_clinic) THEN RAISE EXCEPTION 'Invalid block reference'; END IF;
   END LOOP;
   DELETE FROM public.clinic_availability WHERE clinic_id=p_clinic AND override_date NOT IN (SELECT (value->>'override_date')::date FROM jsonb_array_elements(cfg->'overrides'));
   FOR item IN SELECT * FROM jsonb_array_elements(cfg->'overrides') LOOP
     INSERT INTO public.clinic_availability(clinic_id,override_date,override_type,start_time,end_time)
     VALUES(p_clinic,(item->>'override_date')::date,item->>'override_type',(item->>'start_time')::time,(item->>'end_time')::time)
     ON CONFLICT(clinic_id,override_date) DO UPDATE SET override_type=excluded.override_type,start_time=excluded.start_time,end_time=excluded.end_time
     WHERE (clinic_availability.override_type,clinic_availability.start_time,clinic_availability.end_time) IS DISTINCT FROM (excluded.override_type,excluded.start_time,excluded.end_time);
   END LOOP;
 ELSE RAISE EXCEPTION 'Unknown calendar action'; END IF;
 SET CONSTRAINTS protect_booked_blocks,protect_booked_hours,protect_booked_overrides IMMEDIATE;
 RETURN public.get_clinic_schedule(p_clinic);
END $$;

-- Extend the reschedule snapshot without changing its contract or ownership.
CREATE OR REPLACE FUNCTION public.booking_schedule_snapshot(p_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object(
 'appointment',jsonb_build_object('id',a.id,'clinic_id',a.clinic_id,'lead_id',a.lead_id,'booking_rep_id',a.booking_rep_id,'patient_name',a.patient_name,'patient_phone',a.patient_phone,'doctor_name',a.doctor_name,'appointment_date',a.appointment_date,'appointment_time',a.appointment_time,'updated_at',a.updated_at,'outcome',a.outcome,'disqualified_at',a.disqualified_at,'consultation_duration_minutes',a.consultation_duration_minutes),
 'clinic',jsonb_build_object('clinic_name',c.clinic_name,'address',c.address,'city',c.city,'state',c.state,'phone',c.phone,'min_appointment_gap_mins',c.min_appointment_gap_mins,'consultation_duration_minutes',c.consultation_duration_minutes,'buffer_minutes',c.buffer_minutes),
 'trading',coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM public.clinic_trading_hours t WHERE t.clinic_id=a.clinic_id),'[]'),
 'blocks',coalesce((SELECT jsonb_agg(to_jsonb(b) ORDER BY b.id) FROM public.clinic_blocked_slots b WHERE b.clinic_id=a.clinic_id),'[]'),
 'overrides',coalesce((SELECT jsonb_agg(to_jsonb(o) ORDER BY o.id) FROM public.clinic_availability o WHERE o.clinic_id=a.clinic_id),'[]'),
 'busy',coalesce((SELECT jsonb_agg(jsonb_build_object('appointment_date',x.appointment_date,'appointment_time',x.appointment_time,'consultation_duration_minutes',x.consultation_duration_minutes) ORDER BY x.id) FROM public.clinic_appointments x WHERE x.clinic_id=a.clinic_id AND x.id<>a.id),'[]'),
 'reminder',(SELECT jsonb_build_object('id',r.id,'status',r.status) FROM public.appointment_reminders r WHERE r.appointment_id=a.id)
 ) FROM public.clinic_appointments a JOIN public.partner_clinics c ON c.id=a.clinic_id WHERE a.id=p_id
$$;

REVOKE ALL ON FUNCTION public.schedule_minute(text),public.schedule_state(text),public.schedule_block_matches(public.clinic_blocked_slots,date),public.schedule_hours(uuid,date),public.clinic_schedule_snapshot(uuid),public.sync_clinic_schedule_settings(),public.protect_booked_time(),public.guard_booking_slot() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.get_clinic_schedule(uuid),public.save_clinic_schedule(uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_clinic_schedule(uuid),public.save_clinic_schedule(uuid,text,jsonb) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.schedule_minute(text),public.schedule_state(text),public.schedule_block_matches(public.clinic_blocked_slots,date),public.schedule_hours(uuid,date),public.clinic_schedule_snapshot(uuid) TO service_role;

-- Same holiday calendar as src/data/au-public-holidays.ts.
INSERT INTO public.clinic_public_holidays(state,holiday_date,name) VALUES
('NSW','2026-01-01','New Year''s Day'),
('NSW','2026-01-26','Australia Day'),
('NSW','2026-04-03','Good Friday'),
('NSW','2026-04-06','Easter Monday'),
('NSW','2026-04-25','ANZAC Day'),
('NSW','2026-12-25','Christmas Day'),
('NSW','2026-12-28','Boxing Day (observed)'),
('NSW','2026-04-04','Easter Saturday'),
('NSW','2026-04-05','Easter Sunday'),
('NSW','2026-06-08','King''s Birthday'),
('NSW','2026-10-05','Labour Day'),
('NSW','2027-01-01','New Year''s Day'),
('NSW','2027-01-26','Australia Day'),
('NSW','2027-03-26','Good Friday'),
('NSW','2027-03-29','Easter Monday'),
('NSW','2027-04-26','ANZAC Day (observed)'),
('NSW','2027-12-27','Christmas Day (observed)'),
('NSW','2027-12-28','Boxing Day (observed)'),
('NSW','2027-03-27','Easter Saturday'),
('NSW','2027-03-28','Easter Sunday'),
('NSW','2027-06-14','King''s Birthday'),
('NSW','2027-10-04','Labour Day'),
('VIC','2026-01-01','New Year''s Day'),
('VIC','2026-01-26','Australia Day'),
('VIC','2026-04-03','Good Friday'),
('VIC','2026-04-06','Easter Monday'),
('VIC','2026-04-25','ANZAC Day'),
('VIC','2026-12-25','Christmas Day'),
('VIC','2026-12-28','Boxing Day (observed)'),
('VIC','2026-03-09','Labour Day'),
('VIC','2026-04-04','Easter Saturday'),
('VIC','2026-04-05','Easter Sunday'),
('VIC','2026-06-08','King''s Birthday'),
('VIC','2026-09-25','AFL Grand Final Friday'),
('VIC','2026-11-03','Melbourne Cup Day'),
('VIC','2027-01-01','New Year''s Day'),
('VIC','2027-01-26','Australia Day'),
('VIC','2027-03-26','Good Friday'),
('VIC','2027-03-29','Easter Monday'),
('VIC','2027-04-26','ANZAC Day (observed)'),
('VIC','2027-12-27','Christmas Day (observed)'),
('VIC','2027-12-28','Boxing Day (observed)'),
('VIC','2027-03-08','Labour Day'),
('VIC','2027-03-27','Easter Saturday'),
('VIC','2027-03-28','Easter Sunday'),
('VIC','2027-06-14','King''s Birthday'),
('VIC','2027-11-02','Melbourne Cup Day'),
('QLD','2026-01-01','New Year''s Day'),
('QLD','2026-01-26','Australia Day'),
('QLD','2026-04-03','Good Friday'),
('QLD','2026-04-06','Easter Monday'),
('QLD','2026-04-25','ANZAC Day'),
('QLD','2026-12-25','Christmas Day'),
('QLD','2026-12-28','Boxing Day (observed)'),
('QLD','2026-05-04','Labour Day'),
('QLD','2026-08-12','Royal Queensland Show (Brisbane)'),
('QLD','2026-10-05','King''s Birthday'),
('QLD','2027-01-01','New Year''s Day'),
('QLD','2027-01-26','Australia Day'),
('QLD','2027-03-26','Good Friday'),
('QLD','2027-03-29','Easter Monday'),
('QLD','2027-04-26','ANZAC Day (observed)'),
('QLD','2027-12-27','Christmas Day (observed)'),
('QLD','2027-12-28','Boxing Day (observed)'),
('QLD','2027-05-03','Labour Day'),
('QLD','2027-08-11','Royal Queensland Show (Brisbane)'),
('QLD','2027-10-04','King''s Birthday'),
('SA','2026-01-01','New Year''s Day'),
('SA','2026-01-26','Australia Day'),
('SA','2026-04-03','Good Friday'),
('SA','2026-04-06','Easter Monday'),
('SA','2026-04-25','ANZAC Day'),
('SA','2026-12-25','Christmas Day'),
('SA','2026-12-28','Boxing Day (observed)'),
('SA','2026-03-09','Adelaide Cup Day'),
('SA','2026-04-04','Easter Saturday'),
('SA','2026-06-08','King''s Birthday'),
('SA','2026-10-05','Labour Day'),
('SA','2026-12-24','Christmas Eve (part day)'),
('SA','2026-12-31','New Year''s Eve (part day)'),
('SA','2027-01-01','New Year''s Day'),
('SA','2027-01-26','Australia Day'),
('SA','2027-03-26','Good Friday'),
('SA','2027-03-29','Easter Monday'),
('SA','2027-04-26','ANZAC Day (observed)'),
('SA','2027-12-27','Christmas Day (observed)'),
('SA','2027-12-28','Boxing Day (observed)'),
('SA','2027-03-08','Adelaide Cup Day'),
('SA','2027-03-27','Easter Saturday'),
('SA','2027-06-14','King''s Birthday'),
('SA','2027-10-04','Labour Day'),
('WA','2026-01-01','New Year''s Day'),
('WA','2026-01-26','Australia Day'),
('WA','2026-04-03','Good Friday'),
('WA','2026-04-06','Easter Monday'),
('WA','2026-04-25','ANZAC Day'),
('WA','2026-12-25','Christmas Day'),
('WA','2026-12-28','Boxing Day (observed)'),
('WA','2026-03-02','Labour Day'),
('WA','2026-06-01','Western Australia Day'),
('WA','2026-09-28','King''s Birthday'),
('WA','2027-01-01','New Year''s Day'),
('WA','2027-01-26','Australia Day'),
('WA','2027-03-26','Good Friday'),
('WA','2027-03-29','Easter Monday'),
('WA','2027-04-26','ANZAC Day (observed)'),
('WA','2027-12-27','Christmas Day (observed)'),
('WA','2027-12-28','Boxing Day (observed)'),
('WA','2027-03-01','Labour Day'),
('WA','2027-06-07','Western Australia Day'),
('WA','2027-09-27','King''s Birthday'),
('TAS','2026-01-01','New Year''s Day'),
('TAS','2026-01-26','Australia Day'),
('TAS','2026-04-03','Good Friday'),
('TAS','2026-04-06','Easter Monday'),
('TAS','2026-04-25','ANZAC Day'),
('TAS','2026-12-25','Christmas Day'),
('TAS','2026-12-28','Boxing Day (observed)'),
('TAS','2026-02-09','Royal Hobart Regatta (south)'),
('TAS','2026-03-09','Eight Hours Day'),
('TAS','2026-04-07','Easter Tuesday (public service)'),
('TAS','2026-06-08','King''s Birthday'),
('TAS','2027-01-01','New Year''s Day'),
('TAS','2027-01-26','Australia Day'),
('TAS','2027-03-26','Good Friday'),
('TAS','2027-03-29','Easter Monday'),
('TAS','2027-04-26','ANZAC Day (observed)'),
('TAS','2027-12-27','Christmas Day (observed)'),
('TAS','2027-12-28','Boxing Day (observed)'),
('TAS','2027-02-08','Royal Hobart Regatta (south)'),
('TAS','2027-03-08','Eight Hours Day'),
('TAS','2027-03-30','Easter Tuesday (public service)'),
('TAS','2027-06-14','King''s Birthday'),
('NT','2026-01-01','New Year''s Day'),
('NT','2026-01-26','Australia Day'),
('NT','2026-04-03','Good Friday'),
('NT','2026-04-06','Easter Monday'),
('NT','2026-04-25','ANZAC Day'),
('NT','2026-12-25','Christmas Day'),
('NT','2026-12-28','Boxing Day (observed)'),
('NT','2026-04-04','Easter Saturday'),
('NT','2026-05-04','May Day'),
('NT','2026-06-08','King''s Birthday'),
('NT','2026-08-03','Picnic Day'),
('NT','2027-01-01','New Year''s Day'),
('NT','2027-01-26','Australia Day'),
('NT','2027-03-26','Good Friday'),
('NT','2027-03-29','Easter Monday'),
('NT','2027-04-26','ANZAC Day (observed)'),
('NT','2027-12-27','Christmas Day (observed)'),
('NT','2027-12-28','Boxing Day (observed)'),
('NT','2027-03-27','Easter Saturday'),
('NT','2027-05-03','May Day'),
('NT','2027-06-14','King''s Birthday'),
('NT','2027-08-02','Picnic Day'),
('ACT','2026-01-01','New Year''s Day'),
('ACT','2026-01-26','Australia Day'),
('ACT','2026-04-03','Good Friday'),
('ACT','2026-04-06','Easter Monday'),
('ACT','2026-04-25','ANZAC Day'),
('ACT','2026-12-25','Christmas Day'),
('ACT','2026-12-28','Boxing Day (observed)'),
('ACT','2026-03-09','Canberra Day'),
('ACT','2026-04-04','Easter Saturday'),
('ACT','2026-04-05','Easter Sunday'),
('ACT','2026-05-25','Reconciliation Day'),
('ACT','2026-06-08','King''s Birthday'),
('ACT','2026-10-05','Labour Day'),
('ACT','2027-01-01','New Year''s Day'),
('ACT','2027-01-26','Australia Day'),
('ACT','2027-03-26','Good Friday'),
('ACT','2027-03-29','Easter Monday'),
('ACT','2027-04-26','ANZAC Day (observed)'),
('ACT','2027-12-27','Christmas Day (observed)'),
('ACT','2027-12-28','Boxing Day (observed)'),
('ACT','2027-03-08','Canberra Day'),
('ACT','2027-03-27','Easter Saturday'),
('ACT','2027-03-28','Easter Sunday'),
('ACT','2027-05-31','Reconciliation Day'),
('ACT','2027-06-14','King''s Birthday'),
('ACT','2027-10-04','Labour Day')
ON CONFLICT(state,holiday_date) DO UPDATE SET name=excluded.name;
