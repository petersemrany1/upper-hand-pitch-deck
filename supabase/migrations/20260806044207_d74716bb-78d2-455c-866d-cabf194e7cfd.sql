-- 1. Trusted email claim helper
CREATE OR REPLACE FUNCTION public.jwt_email_trusted()
RETURNS text
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) THEN NULL
    WHEN coalesce(
           (auth.jwt() -> 'user_metadata' ->> 'email_verified')::boolean,
           (auth.jwt() ->> 'email_verified')::boolean,
           true
         ) THEN lower(nullif(auth.jwt() ->> 'email', ''))
    ELSE NULL
  END
$$;

REVOKE ALL ON FUNCTION public.jwt_email_trusted() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.jwt_email_trusted() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sales_reps sr
    WHERE (
        sr.id = auth.uid()
        OR (public.jwt_email_trusted() IS NOT NULL AND lower(sr.email) = public.jwt_email_trusted())
      )
      AND sr.role = 'admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.current_sales_rep_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT sr.id
  FROM public.sales_reps sr
  WHERE sr.id = auth.uid()
     OR (public.jwt_email_trusted() IS NOT NULL AND lower(sr.email) = public.jwt_email_trusted())
  ORDER BY (sr.id = auth.uid()) DESC
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_sales_rep_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT sr.role
  FROM public.sales_reps sr
  WHERE sr.id = auth.uid()
     OR (public.jwt_email_trusted() IS NOT NULL AND lower(sr.email) = public.jwt_email_trusted())
  ORDER BY (sr.id = auth.uid()) DESC
  LIMIT 1
$$;

-- 2. clinic_leads: assigned reps can see/update their own leads
CREATE POLICY "Assigned reps can read their clinic leads"
ON public.clinic_leads FOR SELECT TO authenticated
USING (assigned_to IS NOT NULL AND assigned_to = public.current_sales_rep_id());

CREATE POLICY "Assigned reps can update their clinic leads"
ON public.clinic_leads FOR UPDATE TO authenticated
USING (assigned_to IS NOT NULL AND assigned_to = public.current_sales_rep_id())
WITH CHECK (assigned_to IS NOT NULL AND assigned_to = public.current_sales_rep_id());

-- 3. Storage: sms-media writes restricted to sales staff
DROP POLICY IF EXISTS "Authenticated upload sms media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update sms media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete sms media" ON storage.objects;

CREATE POLICY "Sales staff upload sms media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'sms-media'
  AND (public.is_admin_user() OR public.has_sales_role(ARRAY['admin','rep','caller','clinic_setter']))
);

CREATE POLICY "Sales staff update sms media"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'sms-media'
  AND (public.is_admin_user() OR public.has_sales_role(ARRAY['admin','rep','caller','clinic_setter']))
)
WITH CHECK (
  bucket_id = 'sms-media'
  AND (public.is_admin_user() OR public.has_sales_role(ARRAY['admin','rep','caller','clinic_setter']))
);

CREATE POLICY "Sales staff delete sms media"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'sms-media'
  AND (public.is_admin_user() OR public.has_sales_role(ARRAY['admin','rep','caller','clinic_setter']))
);

-- 4. Storage: mms-images uploads restricted to sales staff
DROP POLICY IF EXISTS "Authenticated upload mms-images" ON storage.objects;

CREATE POLICY "Sales staff upload mms-images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'mms-images'
  AND (public.is_admin_user() OR public.has_sales_role(ARRAY['admin','rep','caller','clinic_setter']))
);

-- 5. Lock down EXECUTE on SECURITY DEFINER functions
-- Trigger functions: never need direct EXECUTE
REVOKE ALL ON FUNCTION public.appointment_lead_sweep() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.auto_create_appointment_reminder() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.clinicflow_close_followups() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.clinicflow_close_followups_on_book() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.clinicflow_create_followups_for_quote() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.clinicflow_settings_guard_stripe_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.clinicflow_spawn_followups() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_admin_only_disqualification() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_booking_before_status_lock() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.meta_lead_booked_sweep() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.meta_lead_set_class() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sms_message_update_thread() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sms_thread_link_clinic() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_reminder_on_reschedule() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.meta_lead_close_siblings(uuid) FROM PUBLIC, anon, authenticated;

-- Backend-only functions: service_role only
REVOKE ALL ON FUNCTION public.email_queue_dispatch() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.email_queue_wake() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_dashboard_stats() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.email_queue_dispatch() TO service_role;
GRANT EXECUTE ON FUNCTION public.email_queue_wake() TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO service_role;

-- Role-check helpers used inside RLS policies: signed-in users only, never anon
REVOKE ALL ON FUNCTION public.is_admin_user() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_sales_rep_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_sales_rep_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_sales_role(text[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_clinic_setter_user() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_clinic_user_for(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_clinic_id() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_sales_rep_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_sales_rep_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_sales_role(text[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_clinic_setter_user() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_clinic_user_for(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_clinic_id() TO authenticated, service_role;