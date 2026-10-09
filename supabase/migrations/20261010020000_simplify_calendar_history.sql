-- Show actual changes only. Keep the immutable starting snapshots stored.
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
   WHERE clinic_id=p_clinic AND operation<>'baseline' AND (p_before IS NULL OR id<p_before)
     AND (p_date IS NULL OR public.calendar_history_on_date(entity_type,before_data,p_date) OR public.calendar_history_on_date(entity_type,after_data,p_date))
   ORDER BY h.id DESC LIMIT page_size+1
 ) page;
 RETURN jsonb_build_object('started_at',(SELECT started_at FROM public.calendar_history_start),'entries',result);
END $$;
