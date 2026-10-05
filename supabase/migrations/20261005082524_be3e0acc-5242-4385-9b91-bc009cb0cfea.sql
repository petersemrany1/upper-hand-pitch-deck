-- Hard rule: clinics must never see a salesperson's name — always the company name.
-- Rewrites commit_booking_reschedule so the clinic-visible note it writes carries
-- "Hair Transplant Group" instead of the rep's name. Internal appointment_reschedules
-- audit rows keep the real actor name (admins only).
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
 VALUES(p_id,a.clinic_id,'Hair Transplant Group','admin','Rescheduled by Hair Transplant Group: '||a.appointment_date||' '||a.appointment_time||' → '||p_date||' '||p_time||CASE WHEN nullif(btrim(p_reason),'') IS NOT NULL THEN '. Reason: '||p_reason ELSE '' END);
 RETURN p_request;
END $$;
REVOKE ALL ON FUNCTION public.commit_booking_reschedule(uuid,uuid,uuid,text,date,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.commit_booking_reschedule(uuid,uuid,uuid,text,date,text,text,text,text) TO service_role;

-- Clean up existing clinic-visible notes that carry a rep's name.
UPDATE public.clinic_appointment_notes
SET body = regexp_replace(body, 'Rescheduled by [^:()]+ \(sales\):', 'Rescheduled by Hair Transplant Group:', 'g')
WHERE author_type = 'admin' AND body ~ 'Rescheduled by [^:()]+ \(sales\):';
UPDATE public.clinic_appointment_notes
SET author_name = 'Hair Transplant Group'
WHERE author_type = 'admin';
