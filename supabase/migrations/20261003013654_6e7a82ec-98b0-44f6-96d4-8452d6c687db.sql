-- Frozen booking ownership; rescheduling never changes sales attribution.
ALTER TABLE public.clinic_appointments ADD COLUMN IF NOT EXISTS booking_rep_id uuid REFERENCES public.sales_reps(id);
UPDATE public.clinic_appointments a SET booking_rep_id = v.rep_id
FROM public.booking_rep_attribution v WHERE v.appointment_id=a.id AND a.booking_rep_id IS NULL;

CREATE OR REPLACE FUNCTION public.booking_sales_actor()
RETURNS TABLE(id uuid, role text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT s.id,s.role FROM public.sales_reps s
  WHERE lower(s.email)=lower(auth.jwt()->>'email') AND s.is_active AND s.role IN ('admin','rep')
    AND NOT EXISTS(SELECT 1 FROM public.clinic_portal_users c WHERE c.id=auth.uid())
$$;
CREATE OR REPLACE FUNCTION public.can_manage_booking(p_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM public.booking_sales_actor() s
    WHERE s.role='admin' OR EXISTS(SELECT 1 FROM public.clinic_appointments a WHERE a.id=p_id AND a.booking_rep_id=s.id))
$$;
REVOKE ALL ON FUNCTION public.booking_sales_actor(), public.can_manage_booking(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.booking_sales_actor(), public.can_manage_booking(uuid) TO authenticated,service_role;

-- Restrictive policies cannot be bypassed by older, broader permissive policies.
DROP POLICY IF EXISTS "booking reminders scoped to owner" ON public.appointment_reminders;
CREATE POLICY "booking reminders scoped to owner" ON public.appointment_reminders AS RESTRICTIVE FOR ALL TO authenticated
  USING(public.can_manage_booking(appointment_id)) WITH CHECK(public.can_manage_booking(appointment_id));
DROP POLICY IF EXISTS "appointment owner or own clinic" ON public.clinic_appointments;
CREATE POLICY "appointment owner or own clinic" ON public.clinic_appointments AS RESTRICTIVE FOR ALL TO authenticated
  USING(public.can_manage_booking(id) OR public.is_clinic_user_for(clinic_id))
  WITH CHECK(public.is_clinic_user_for(clinic_id) OR EXISTS(SELECT 1 FROM public.booking_sales_actor() s WHERE s.role='admin' OR s.id=booking_rep_id));

CREATE OR REPLACE FUNCTION public.freeze_booking_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE actor record;
BEGIN
  SELECT * INTO actor FROM public.booking_sales_actor();
  IF TG_OP='INSERT' THEN
    IF actor.role='rep' THEN NEW.booking_rep_id:=actor.id;
    ELSIF NEW.booking_rep_id IS NULL THEN SELECT rep_id INTO NEW.booking_rep_id FROM public.meta_leads WHERE id=NEW.lead_id; END IF;
  ELSIF NEW.booking_rep_id IS DISTINCT FROM OLD.booking_rep_id THEN
    IF NOT COALESCE(actor.role='admin',false) AND COALESCE(auth.role(),'')<>'service_role' THEN RAISE EXCEPTION 'Only an administrator may reassign booking ownership'; END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS booking_owner_guard ON public.clinic_appointments;
CREATE TRIGGER booking_owner_guard BEFORE INSERT OR UPDATE ON public.clinic_appointments FOR EACH ROW EXECUTE FUNCTION public.freeze_booking_owner();
REVOKE ALL ON FUNCTION public.freeze_booking_owner() FROM PUBLIC,anon,authenticated;

-- Every writer takes the same clinic lock, including the partner portal.
-- Enforce overlap/minimum-gap protection even if an older screen has stale slots.
CREATE OR REPLACE FUNCTION public.guard_booking_slot()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE gap_mins integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.clinic_id::text,0));
  IF TG_OP='UPDATE' AND NEW.appointment_date=OLD.appointment_date AND NEW.appointment_time::time=OLD.appointment_time::time AND NEW.clinic_id=OLD.clinic_id THEN RETURN NEW; END IF;
  SELECT greatest(coalesce(min_appointment_gap_mins,0),0) INTO gap_mins FROM public.partner_clinics WHERE id=NEW.clinic_id;
  IF EXISTS(SELECT 1 FROM public.clinic_appointments a WHERE a.clinic_id=NEW.clinic_id AND a.id<>NEW.id AND a.appointment_date=NEW.appointment_date
    AND a.appointment_time::time < NEW.appointment_time::time + make_interval(mins=>30+gap_mins)
    AND a.appointment_time::time + make_interval(mins=>30+gap_mins) > NEW.appointment_time::time) THEN
    RAISE EXCEPTION 'That time was just taken or overlaps another appointment. Choose another time.';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS booking_slot_guard ON public.clinic_appointments;
CREATE TRIGGER booking_slot_guard BEFORE INSERT OR UPDATE OF appointment_date,appointment_time,clinic_id ON public.clinic_appointments FOR EACH ROW EXECUTE FUNCTION public.guard_booking_slot();
REVOKE ALL ON FUNCTION public.guard_booking_slot() FROM PUBLIC,anon,authenticated;

-- Reps may see occupied TIMES for availability, never other patients' details.
CREATE OR REPLACE FUNCTION public.booking_busy_times(p_clinic uuid)
RETURNS TABLE(appointment_date date,appointment_time text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT a.appointment_date,a.appointment_time FROM public.clinic_appointments a
  WHERE a.clinic_id=p_clinic AND (EXISTS(SELECT 1 FROM public.booking_sales_actor()) OR public.is_clinic_user_for(p_clinic))
$$;
REVOKE ALL ON FUNCTION public.booking_busy_times(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.booking_busy_times(uuid) TO authenticated,service_role;

CREATE TABLE IF NOT EXISTS public.appointment_reschedules (
  id uuid PRIMARY KEY,
  appointment_id uuid REFERENCES public.clinic_appointments(id) ON DELETE SET NULL,
  actor_id uuid NOT NULL, actor_name text NOT NULL, actor_role text NOT NULL,
  old_date date NOT NULL, old_time text NOT NULL, new_date date NOT NULL, new_time text NOT NULL,
  reason text, created_at timestamptz NOT NULL DEFAULT now(),
  sms_body text NOT NULL, sms_phone text NOT NULL,
  sms_status text NOT NULL DEFAULT 'pending' CHECK(sms_status IN ('pending','sending','accepted','failed','uncertain')),
  sms_sid text, sms_error text
);
ALTER TABLE public.appointment_reschedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sales read own reschedules" ON public.appointment_reschedules;
CREATE POLICY "sales read own reschedules" ON public.appointment_reschedules FOR SELECT TO authenticated USING(public.can_manage_booking(appointment_id));
-- Audit/outbox writes are service-only. No client can forge a sent status or actor.
REVOKE INSERT,UPDATE,DELETE ON public.appointment_reschedules FROM authenticated,anon;
GRANT SELECT ON public.appointment_reschedules TO authenticated;
GRANT ALL ON public.appointment_reschedules TO service_role;

-- Internal snapshot: stable ordering makes its checksum a concurrency token.
CREATE OR REPLACE FUNCTION public.booking_schedule_snapshot(p_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object(
  'appointment',jsonb_build_object('id',a.id,'clinic_id',a.clinic_id,'lead_id',a.lead_id,'booking_rep_id',a.booking_rep_id,'patient_name',a.patient_name,'patient_phone',a.patient_phone,'doctor_name',a.doctor_name,'appointment_date',a.appointment_date,'appointment_time',a.appointment_time,'updated_at',a.updated_at,'outcome',a.outcome,'disqualified_at',a.disqualified_at),
  'clinic',jsonb_build_object('clinic_name',c.clinic_name,'address',c.address,'city',c.city,'state',c.state,'phone',c.phone,'min_appointment_gap_mins',c.min_appointment_gap_mins),
  'trading',coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM public.clinic_trading_hours t WHERE t.clinic_id=a.clinic_id),'[]'),
  'blocks',coalesce((SELECT jsonb_agg(to_jsonb(b) ORDER BY b.id) FROM public.clinic_blocked_slots b WHERE b.clinic_id=a.clinic_id),'[]'),
  'overrides',coalesce((SELECT jsonb_agg(to_jsonb(o) ORDER BY o.id) FROM public.clinic_availability o WHERE o.clinic_id=a.clinic_id),'[]'),
  'busy',coalesce((SELECT jsonb_agg(jsonb_build_object('appointment_date',x.appointment_date,'appointment_time',x.appointment_time) ORDER BY x.id) FROM public.clinic_appointments x WHERE x.clinic_id=a.clinic_id AND x.id<>a.id),'[]'),
  'reminder', (SELECT jsonb_build_object('id',r.id,'status',r.status) FROM public.appointment_reminders r WHERE r.appointment_id=a.id)
 ) FROM public.clinic_appointments a JOIN public.partner_clinics c ON c.id=a.clinic_id WHERE a.id=p_id
$$;
REVOKE ALL ON FUNCTION public.booking_schedule_snapshot(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.booking_schedule_snapshot(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.get_booking_reschedule(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE snapshot jsonb;
BEGIN
 IF NOT public.can_manage_booking(p_id) THEN RAISE EXCEPTION 'You do not have access to this booking'; END IF;
 snapshot:=public.booking_schedule_snapshot(p_id);
 IF snapshot IS NULL THEN RAISE EXCEPTION 'Appointment not found'; END IF;
 RETURN jsonb_build_object('snapshot',snapshot,'version',md5(snapshot::text));
END $$;
REVOKE ALL ON FUNCTION public.get_booking_reschedule(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_booking_reschedule(uuid) TO authenticated,service_role;

-- Called only by the authenticated server AFTER validating the shared slot rules.
-- The caller identity is resolved from the session, never accepted from the UI.
CREATE OR REPLACE FUNCTION public.commit_booking_reschedule(
 p_id uuid,p_request uuid,p_actor uuid,p_version text,p_date date,p_time text,p_reason text,p_sms text,p_phone text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.clinic_appointments; s public.sales_reps; snapshot jsonb; previous public.appointment_reschedules;
BEGIN
 SELECT * INTO a FROM public.clinic_appointments WHERE id=p_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Appointment not found'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(a.clinic_id::text,0));
 SELECT * INTO a FROM public.clinic_appointments WHERE id=p_id FOR UPDATE;
 SELECT * INTO s FROM public.sales_reps WHERE id=p_actor AND is_active AND role IN ('admin','rep');
 IF s.id IS NULL OR (s.role<>'admin' AND a.booking_rep_id IS DISTINCT FROM s.id) THEN RAISE EXCEPTION 'You do not have access to this booking'; END IF;
 SELECT * INTO previous FROM public.appointment_reschedules WHERE id=p_request;
 IF FOUND THEN
   IF previous.appointment_id<>p_id OR previous.actor_id<>s.id OR previous.new_date<>p_date OR previous.new_time::time<>p_time::time THEN RAISE EXCEPTION 'Request already used'; END IF;
   RETURN previous.id;
 END IF;
 snapshot:=public.booking_schedule_snapshot(p_id);
 IF md5(snapshot::text) IS DISTINCT FROM p_version THEN RAISE EXCEPTION 'Appointment or availability changed. Refresh and review the new details.'; END IF;
 IF a.outcome IS NOT NULL OR a.disqualified_at IS NOT NULL OR snapshot#>>'{reminder,status}' IS DISTINCT FROM 'confirmed' THEN RAISE EXCEPTION 'Only active confirmed appointments can be rescheduled'; END IF;
 IF a.appointment_date=p_date AND a.appointment_time::time=p_time::time THEN RAISE EXCEPTION 'Choose a different date or time'; END IF;
 UPDATE public.clinic_appointments SET appointment_date=p_date,appointment_time=p_time WHERE id=p_id;
 UPDATE public.meta_leads SET booking_date=p_date,booking_time=p_time WHERE id=a.lead_id;
 INSERT INTO public.appointment_reschedules(id,appointment_id,actor_id,actor_name,actor_role,old_date,old_time,new_date,new_time,reason,sms_body,sms_phone)
 VALUES(p_request,p_id,s.id,s.name,s.role,a.appointment_date,a.appointment_time,p_date,p_time,nullif(btrim(p_reason),''),p_sms,p_phone);
 INSERT INTO public.clinic_appointment_notes(appointment_id,clinic_id,author_name,author_type,body)
 VALUES(p_id,a.clinic_id,s.name,'admin','Rescheduled by '||s.name||' (sales): '||a.appointment_date||' '||a.appointment_time||' → '||p_date||' '||p_time||CASE WHEN nullif(btrim(p_reason),'') IS NOT NULL THEN '. Reason: '||p_reason ELSE '' END);
 RETURN p_request;
END $$;
REVOKE ALL ON FUNCTION public.commit_booking_reschedule(uuid,uuid,uuid,text,date,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.commit_booking_reschedule(uuid,uuid,uuid,text,date,text,text,text,text) TO service_role;

-- Give sales reps their own appointment page, never a partner-portal tab.
UPDATE public.sales_reps SET allowed_tabs = array_append(array_remove(allowed_tabs,'partner_clinics'),'appointments')
WHERE role='rep' AND allowed_tabs IS NOT NULL AND cardinality(allowed_tabs)>0 AND NOT ('appointments'=ANY(allowed_tabs));
UPDATE public.sales_reps SET allowed_tabs=array_remove(allowed_tabs,'partner_clinics') WHERE role='rep' AND 'partner_clinics'=ANY(allowed_tabs);

ALTER TABLE public.appointment_reminders ADD COLUMN IF NOT EXISTS schedule_changed_at timestamptz;
UPDATE public.appointment_reminders SET schedule_changed_at=booked_at WHERE schedule_changed_at IS NULL;
ALTER TABLE public.appointment_reminders ALTER COLUMN schedule_changed_at SET DEFAULT now();
CREATE OR REPLACE FUNCTION public.stamp_reminder_schedule() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.booking_date IS DISTINCT FROM OLD.booking_date OR NEW.booking_time IS DISTINCT FROM OLD.booking_time THEN NEW.schedule_changed_at:=now(); END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS reminder_schedule_stamp ON public.appointment_reminders;
CREATE TRIGGER reminder_schedule_stamp BEFORE UPDATE ON public.appointment_reminders FOR EACH ROW EXECUTE FUNCTION public.stamp_reminder_schedule();
REVOKE ALL ON FUNCTION public.stamp_reminder_schedule() FROM PUBLIC,anon,authenticated;

-- A portal change also keeps the lead's displayed booking in step.
CREATE OR REPLACE FUNCTION public.sync_lead_booking_schedule() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.appointment_date IS DISTINCT FROM OLD.appointment_date OR NEW.appointment_time IS DISTINCT FROM OLD.appointment_time THEN
   UPDATE public.meta_leads SET booking_date=NEW.appointment_date,booking_time=NEW.appointment_time WHERE id=NEW.lead_id;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS sync_lead_booking_schedule ON public.clinic_appointments;
CREATE TRIGGER sync_lead_booking_schedule AFTER UPDATE ON public.clinic_appointments FOR EACH ROW EXECUTE FUNCTION public.sync_lead_booking_schedule();
REVOKE ALL ON FUNCTION public.sync_lead_booking_schedule() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.lock_clinic_booking_schedule() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF TG_OP='DELETE' THEN PERFORM pg_advisory_xact_lock(hashtextextended(OLD.clinic_id::text,0)); RETURN OLD; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.clinic_id::text,0)); RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS lock_booking_hours ON public.clinic_trading_hours;
CREATE TRIGGER lock_booking_hours BEFORE INSERT OR UPDATE OR DELETE ON public.clinic_trading_hours FOR EACH ROW EXECUTE FUNCTION public.lock_clinic_booking_schedule();
DROP TRIGGER IF EXISTS lock_booking_blocks ON public.clinic_blocked_slots;
CREATE TRIGGER lock_booking_blocks BEFORE INSERT OR UPDATE OR DELETE ON public.clinic_blocked_slots FOR EACH ROW EXECUTE FUNCTION public.lock_clinic_booking_schedule();
DROP TRIGGER IF EXISTS lock_booking_overrides ON public.clinic_availability;
CREATE TRIGGER lock_booking_overrides BEFORE INSERT OR UPDATE OR DELETE ON public.clinic_availability FOR EACH ROW EXECUTE FUNCTION public.lock_clinic_booking_schedule();
REVOKE ALL ON FUNCTION public.lock_clinic_booking_schedule() FROM PUBLIC,anon,authenticated;

DROP POLICY IF EXISTS "booking notes owner or clinic" ON public.clinic_appointment_notes;
CREATE POLICY "booking notes owner or clinic" ON public.clinic_appointment_notes AS RESTRICTIVE FOR SELECT TO authenticated
 USING(public.can_manage_booking(appointment_id) OR public.is_clinic_user_for(clinic_id));