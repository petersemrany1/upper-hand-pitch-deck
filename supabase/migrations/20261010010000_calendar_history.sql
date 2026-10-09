BEGIN;

-- Database-owned, append-only evidence of committed calendar changes.
-- Baselines describe the state at installation, never an invented past edit.
CREATE TABLE IF NOT EXISTS public.calendar_history_start (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 started_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE IF NOT EXISTS public.clinic_calendar_history (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 clinic_id uuid NOT NULL,
 entity_type text NOT NULL CHECK(entity_type IN ('block','hours','weekly_hours','settings','appointment')),
 entity_id uuid NOT NULL,
 operation text NOT NULL CHECK(operation IN ('added','changed','removed','baseline')),
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 actor_id uuid,
 actor_name text NOT NULL,
 actor_role text NOT NULL,
 before_data jsonb,
 after_data jsonb
);
CREATE INDEX IF NOT EXISTS clinic_calendar_history_page ON public.clinic_calendar_history(clinic_id,id DESC);
ALTER TABLE public.calendar_history_start ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_calendar_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.calendar_history_start,public.clinic_calendar_history FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON SEQUENCE public.clinic_calendar_history_id_seq FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.calendar_history_fields(kind text, row_data jsonb)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path=public AS $$
DECLARE keys text[]; result jsonb;
BEGIN
 IF row_data IS NULL THEN RETURN NULL; END IF;
 keys:=CASE kind
 WHEN 'block' THEN ARRAY['slot_date','slot_start','slot_end','is_recurring','recur_pattern','recur_day_of_week','recur_days_of_week','recur_day_of_month','recur_nth_week','recur_until','excluded_dates']
 WHEN 'hours' THEN ARRAY['override_date','override_type','start_time','end_time']
 WHEN 'weekly_hours' THEN ARRAY['day_of_week','open_time','close_time','is_closed','consult_duration_mins']
 WHEN 'settings' THEN ARRAY['consultation_duration_minutes','buffer_minutes','state']
 WHEN 'appointment' THEN ARRAY['appointment_date','appointment_time','consultation_duration_minutes','patient_name'] END;
 SELECT jsonb_object_agg(key,value) INTO result FROM jsonb_each(row_data) WHERE key=ANY(keys);
 IF kind='appointment' THEN
   result:=result||jsonb_build_object('calendar_status',CASE WHEN row_data->>'outcome'='disqualified' OR row_data->>'disqualified_at' IS NOT NULL THEN 'disqualified' ELSE 'active' END);
 END IF;
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.record_calendar_history()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE kind text:=TG_ARGV[0]; prior jsonb; next_row jsonb; before_value jsonb; after_value jsonb;
 old_clinic uuid; new_clinic uuid; actor uuid:=auth.uid(); actor_label text; actor_type text; rep record;
BEGIN
 IF TG_OP<>'INSERT' THEN
   prior:=to_jsonb(OLD); before_value:=public.calendar_history_fields(kind,prior);
   old_clinic:=(CASE WHEN kind='settings' THEN prior->>'id' ELSE prior->>'clinic_id' END)::uuid;
 END IF;
 IF TG_OP<>'DELETE' THEN
   next_row:=to_jsonb(NEW); after_value:=public.calendar_history_fields(kind,next_row);
   new_clinic:=(CASE WHEN kind='settings' THEN next_row->>'id' ELSE next_row->>'clinic_id' END)::uuid;
 END IF;
 IF TG_OP='UPDATE' AND old_clinic=new_clinic AND before_value IS NOT DISTINCT FROM after_value THEN RETURN NULL; END IF;
 -- Identity comes from the verified database session, never from form input.
 IF actor IS NOT NULL THEN
   SELECT coalesce(nullif(to_jsonb(u)->>'email',''),'Clinic account') INTO actor_label FROM public.clinic_portal_users u WHERE u.id=actor;
   IF FOUND THEN actor_type:='clinic';
   ELSE
     SELECT s.name,a.role INTO rep FROM public.booking_sales_actor() a JOIN public.sales_reps s ON s.id=a.id LIMIT 1;
     IF FOUND THEN actor_label:=rep.name; actor_type:=rep.role;
     ELSE actor_label:='Signed-in account'; actor_type:='user'; END IF;
   END IF;
 ELSE actor_label:='System / integration'; actor_type:='system'; END IF;
 -- A clinic transfer has separate entries: neither clinic receives the other's details.
 IF TG_OP='DELETE' OR TG_OP='UPDATE' AND old_clinic IS DISTINCT FROM new_clinic THEN
   INSERT INTO public.clinic_calendar_history(clinic_id,entity_type,entity_id,operation,actor_id,actor_name,actor_role,before_data)
   VALUES(old_clinic,kind,(prior->>'id')::uuid,'removed',actor,coalesce(actor_label,'Signed-in account'),actor_type,before_value);
 END IF;
 IF TG_OP<>'DELETE' THEN
   INSERT INTO public.clinic_calendar_history(clinic_id,entity_type,entity_id,operation,actor_id,actor_name,actor_role,before_data,after_data)
   VALUES(new_clinic,kind,(next_row->>'id')::uuid,CASE WHEN TG_OP='INSERT' OR old_clinic IS DISTINCT FROM new_clinic THEN 'added' ELSE 'changed' END,
     actor,coalesce(actor_label,'Signed-in account'),actor_type,CASE WHEN old_clinic=new_clinic THEN before_value END,after_value);
 END IF;
 RETURN NULL;
END $$;

-- Locks make installation's baseline and trigger activation a single boundary.
LOCK TABLE public.partner_clinics,public.clinic_appointments,public.clinic_blocked_slots,public.clinic_availability,public.clinic_trading_hours IN SHARE ROW EXCLUSIVE MODE;
DO $$
DECLARE started timestamptz; item record;
BEGIN
 INSERT INTO public.calendar_history_start(singleton) VALUES(true) ON CONFLICT DO NOTHING RETURNING started_at INTO started;
 IF started IS NOT NULL THEN
   FOR item IN SELECT * FROM (VALUES
     ('clinic_blocked_slots','block'),('clinic_availability','hours'),('clinic_trading_hours','weekly_hours'),('partner_clinics','settings'),('clinic_appointments','appointment')
   ) AS sources(table_name,kind) LOOP
     EXECUTE format('INSERT INTO public.clinic_calendar_history(clinic_id,entity_type,entity_id,operation,recorded_at,actor_name,actor_role,after_data)
       SELECT %s,$1,id,''baseline'',$2,''History started'',''system'',public.calendar_history_fields($1,to_jsonb(t)) FROM public.%I t',
       CASE WHEN item.kind='settings' THEN 'id' ELSE 'clinic_id' END,item.table_name) USING item.kind,started;
   END LOOP;
 END IF;
 FOR item IN SELECT * FROM (VALUES
   ('clinic_blocked_slots','block'),('clinic_availability','hours'),('clinic_trading_hours','weekly_hours'),('partner_clinics','settings'),('clinic_appointments','appointment')
 ) AS sources(table_name,kind) LOOP
   EXECUTE format('DROP TRIGGER IF EXISTS calendar_history_capture ON public.%I',item.table_name);
   EXECUTE format('CREATE TRIGGER calendar_history_capture AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.record_calendar_history(%L)',item.table_name,item.kind);
 END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.protect_calendar_history()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN RAISE EXCEPTION 'Calendar history is read-only'; END $$;
DROP TRIGGER IF EXISTS calendar_history_immutable ON public.clinic_calendar_history;
CREATE TRIGGER calendar_history_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON public.clinic_calendar_history FOR EACH STATEMENT EXECUTE FUNCTION public.protect_calendar_history();
DROP TRIGGER IF EXISTS calendar_history_start_immutable ON public.calendar_history_start;
CREATE TRIGGER calendar_history_start_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON public.calendar_history_start FOR EACH STATEMENT EXECUTE FUNCTION public.protect_calendar_history();

CREATE OR REPLACE FUNCTION public.calendar_history_on_date(kind text, value jsonb, target date)
RETURNS boolean LANGUAGE plpgsql STABLE SET search_path=public AS $$
BEGIN
 IF value IS NULL THEN RETURN false; END IF;
 RETURN CASE kind
 WHEN 'appointment' THEN (value->>'appointment_date')::date=target
 WHEN 'hours' THEN (value->>'override_date')::date=target
 WHEN 'weekly_hours' THEN (value->>'day_of_week')::integer=extract(isodow FROM target)::integer-1
 WHEN 'settings' THEN true
 WHEN 'block' THEN public.schedule_block_matches(jsonb_populate_record(NULL::public.clinic_blocked_slots,value),target)
 ELSE false END;
END $$;

CREATE OR REPLACE FUNCTION public.get_clinic_calendar_history(p_clinic uuid,p_before bigint DEFAULT NULL,p_date date DEFAULT NULL,p_limit integer DEFAULT 50)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb; page_size integer:=least(100,greatest(1,coalesce(p_limit,50)));
BEGIN
 IF NOT (coalesce(auth.role(),'')='service_role' OR public.is_clinic_user_for(p_clinic) OR EXISTS(SELECT 1 FROM public.booking_sales_actor() WHERE role='admin')) THEN
   RAISE EXCEPTION 'You do not have access to this calendar history';
 END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(page)-'sort_id' ORDER BY page.sort_id DESC),'[]') INTO result FROM (
   SELECT id::text AS id,id AS sort_id,entity_type,entity_id,operation,recorded_at,actor_name,actor_role,before_data,after_data
   FROM public.clinic_calendar_history h
   WHERE clinic_id=p_clinic AND (p_before IS NULL OR id<p_before)
     AND (p_date IS NULL OR public.calendar_history_on_date(entity_type,before_data,p_date) OR public.calendar_history_on_date(entity_type,after_data,p_date))
   ORDER BY h.id DESC LIMIT page_size+1
 ) page;
 RETURN jsonb_build_object('started_at',(SELECT started_at FROM public.calendar_history_start),'entries',result);
END $$;
REVOKE ALL ON FUNCTION public.calendar_history_fields(text,jsonb),public.record_calendar_history(),public.protect_calendar_history(),public.calendar_history_on_date(text,jsonb,date) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.get_clinic_calendar_history(uuid,bigint,date,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_clinic_calendar_history(uuid,bigint,date,integer) TO authenticated,service_role;

COMMIT;
