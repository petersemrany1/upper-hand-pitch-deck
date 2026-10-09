-- Disqualified bookings remain in history, but do not occupy calendar time.
BEGIN;
CREATE OR REPLACE FUNCTION public.booking_busy_times(p_clinic uuid)
 RETURNS TABLE(appointment_date date, appointment_time text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 SELECT a.appointment_date,a.appointment_time FROM public.clinic_appointments a
 WHERE a.outcome IS DISTINCT FROM 'disqualified' AND a.disqualified_at IS NULL AND a.clinic_id=p_clinic AND (EXISTS(SELECT 1 FROM public.booking_sales_actor()) OR public.is_clinic_user_for(p_clinic))
$function$;

CREATE OR REPLACE FUNCTION public.guard_booking_slot()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
 IF NEW.outcome='disqualified' OR NEW.disqualified_at IS NOT NULL THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND OLD.outcome IS DISTINCT FROM 'disqualified' AND OLD.disqualified_at IS NULL AND NEW.appointment_date=OLD.appointment_date AND NEW.appointment_time::time=OLD.appointment_time::time AND NEW.clinic_id=OLD.clinic_id THEN RETURN NEW; END IF;
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
 IF EXISTS(SELECT 1 FROM public.clinic_appointments a WHERE a.outcome IS DISTINCT FROM 'disqualified' AND a.disqualified_at IS NULL AND a.clinic_id=NEW.clinic_id AND a.id<>NEW.id AND a.appointment_date=NEW.appointment_date
 AND public.schedule_minute(a.appointment_time)<finishes+gap
 AND public.schedule_minute(a.appointment_time)+a.consultation_duration_minutes+gap>starts) THEN
 RAISE EXCEPTION 'That time was just taken or overlaps another appointment or buffer. Choose another time.';
 END IF;
 RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.protect_booked_time()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE clinic uuid; day date; a public.clinic_appointments; b public.clinic_blocked_slots; h record; starts integer; finishes integer;
BEGIN
 clinic:=CASE WHEN TG_OP='DELETE' THEN OLD.clinic_id ELSE NEW.clinic_id END;
 IF TG_TABLE_NAME='clinic_trading_hours' AND coalesce(current_setting('app.confirmed_hours_clinic',true),'')=clinic::text THEN RETURN NULL; END IF;
 IF TG_TABLE_NAME='clinic_blocked_slots' THEN
 IF TG_OP='DELETE' THEN RETURN NULL; END IF;
 SELECT * INTO b FROM public.clinic_blocked_slots WHERE id=NEW.id;
 IF NOT FOUND THEN RETURN NULL; END IF;
 FOR a IN SELECT * FROM public.clinic_appointments WHERE outcome IS DISTINCT FROM 'disqualified' AND disqualified_at IS NULL AND clinic_id=clinic AND appointment_date >= (now() AT TIME ZONE 'Australia/Sydney')::date LOOP
 IF public.schedule_block_matches(b,a.appointment_date) AND public.schedule_minute(a.appointment_time)<public.schedule_minute(b.slot_end::text)
 AND public.schedule_minute(a.appointment_time)+a.consultation_duration_minutes>public.schedule_minute(b.slot_start::text)
 THEN RAISE EXCEPTION 'A patient is already booked on % at %. Keep their appointment free.',a.appointment_date,a.appointment_time; END IF;
 END LOOP;
 ELSE
 FOR a IN SELECT * FROM public.clinic_appointments WHERE outcome IS DISTINCT FROM 'disqualified' AND disqualified_at IS NULL AND clinic_id=clinic AND appointment_date >= (now() AT TIME ZONE 'Australia/Sydney')::date LOOP
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
END $function$;

CREATE OR REPLACE FUNCTION public.clinic_schedule_snapshot(p_clinic uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 SELECT jsonb_build_object(
 'clinic_id',c.id,'clinic_name',c.clinic_name,'state',c.state,
 'consultation_minutes',c.consultation_duration_minutes,'buffer_minutes',c.buffer_minutes,
 'trading',coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.day_of_week) FROM public.clinic_trading_hours t WHERE t.clinic_id=c.id),'[]'),
 'blocks',coalesce((SELECT jsonb_agg(to_jsonb(b) ORDER BY b.id) FROM public.clinic_blocked_slots b WHERE b.clinic_id=c.id),'[]'),
 'overrides',coalesce((SELECT jsonb_agg(to_jsonb(o) ORDER BY o.override_date) FROM public.clinic_availability o WHERE o.clinic_id=c.id),'[]'),
 'appointments',coalesce((SELECT jsonb_agg(jsonb_build_object('id',a.id,'appointment_date',a.appointment_date,'appointment_time',a.appointment_time,'consultation_duration_minutes',a.consultation_duration_minutes) ORDER BY a.id) FROM public.clinic_appointments a WHERE a.outcome IS DISTINCT FROM 'disqualified' AND a.disqualified_at IS NULL AND a.clinic_id=c.id),'[]')
 ) FROM public.partner_clinics c WHERE c.id=p_clinic
$function$;

CREATE OR REPLACE FUNCTION public.booking_schedule_snapshot(p_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 SELECT jsonb_build_object(
 'appointment',jsonb_build_object('id',a.id,'clinic_id',a.clinic_id,'lead_id',a.lead_id,'booking_rep_id',a.booking_rep_id,'patient_name',a.patient_name,'patient_phone',a.patient_phone,'doctor_name',a.doctor_name,'appointment_date',a.appointment_date,'appointment_time',a.appointment_time,'updated_at',a.updated_at,'outcome',a.outcome,'disqualified_at',a.disqualified_at,'consultation_duration_minutes',a.consultation_duration_minutes),
 'clinic',jsonb_build_object('clinic_name',c.clinic_name,'address',c.address,'city',c.city,'state',c.state,'phone',c.phone,'min_appointment_gap_mins',c.min_appointment_gap_mins,'consultation_duration_minutes',c.consultation_duration_minutes,'buffer_minutes',c.buffer_minutes),
 'trading',coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM public.clinic_trading_hours t WHERE t.clinic_id=a.clinic_id),'[]'),
 'blocks',coalesce((SELECT jsonb_agg(to_jsonb(b) ORDER BY b.id) FROM public.clinic_blocked_slots b WHERE b.clinic_id=a.clinic_id),'[]'),
 'overrides',coalesce((SELECT jsonb_agg(to_jsonb(o) ORDER BY o.id) FROM public.clinic_availability o WHERE o.clinic_id=a.clinic_id),'[]'),
 'busy',coalesce((SELECT jsonb_agg(jsonb_build_object('appointment_date',x.appointment_date,'appointment_time',x.appointment_time,'consultation_duration_minutes',x.consultation_duration_minutes) ORDER BY x.id) FROM public.clinic_appointments x WHERE x.outcome IS DISTINCT FROM 'disqualified' AND x.disqualified_at IS NULL AND x.clinic_id=a.clinic_id AND x.id<>a.id),'[]'),
 'reminder',(SELECT jsonb_build_object('id',r.id,'status',r.status) FROM public.appointment_reminders r WHERE r.appointment_id=a.id)
 ) FROM public.clinic_appointments a JOIN public.partner_clinics c ON c.id=a.clinic_id WHERE a.id=p_id
$function$;
DROP TRIGGER IF EXISTS booking_slot_guard ON public.clinic_appointments;
CREATE TRIGGER booking_slot_guard BEFORE INSERT OR UPDATE OF appointment_date,appointment_time,clinic_id,consultation_duration_minutes,outcome,disqualified_at
ON public.clinic_appointments FOR EACH ROW EXECUTE FUNCTION public.guard_booking_slot();
COMMIT;
