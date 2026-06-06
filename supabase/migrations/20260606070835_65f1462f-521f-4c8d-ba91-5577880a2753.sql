
-- 1. clinic_contacts: tighten RLS
DROP POLICY IF EXISTS "Authenticated read clinic_contacts" ON public.clinic_contacts;
DROP POLICY IF EXISTS "Authenticated insert clinic_contacts" ON public.clinic_contacts;
DROP POLICY IF EXISTS "Authenticated update clinic_contacts" ON public.clinic_contacts;
DROP POLICY IF EXISTS "Authenticated delete clinic_contacts" ON public.clinic_contacts;

CREATE POLICY "Sales staff read clinic_contacts" ON public.clinic_contacts
  FOR SELECT TO authenticated
  USING (public.is_admin_user() OR public.has_sales_role(ARRAY['admin','rep','caller','clinic_setter']));

CREATE POLICY "Sales staff insert clinic_contacts" ON public.clinic_contacts
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_user() OR public.has_sales_role(ARRAY['admin','rep','caller','clinic_setter']));

CREATE POLICY "Sales staff update clinic_contacts" ON public.clinic_contacts
  FOR UPDATE TO authenticated
  USING (public.is_admin_user() OR public.has_sales_role(ARRAY['admin','rep','caller','clinic_setter']))
  WITH CHECK (public.is_admin_user() OR public.has_sales_role(ARRAY['admin','rep','caller','clinic_setter']));

CREATE POLICY "Admins delete clinic_contacts" ON public.clinic_contacts
  FOR DELETE TO authenticated
  USING (public.is_admin_user());

-- 2. clinic_appointment_notes: sales rep read scoping
CREATE POLICY "Sales reps read appt notes" ON public.clinic_appointment_notes
  FOR SELECT TO authenticated
  USING (public.is_admin_user() OR public.has_sales_role(ARRAY['admin','rep','caller','clinic_setter']));

-- 3. Storage: drop public-role SELECT on mms-images (CDN still serves public bucket)
DROP POLICY IF EXISTS "Public read mms-images" ON storage.objects;

-- 4. Storage: tighten sms-media read to sales staff
DROP POLICY IF EXISTS "Authenticated read sms media" ON storage.objects;
CREATE POLICY "Sales staff read sms media" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'sms-media'
    AND (public.is_admin_user() OR public.has_sales_role(ARRAY['admin','rep','caller','clinic_setter']))
  );

-- 5. Revoke EXECUTE from anon on internal SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.current_clinic_id() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.current_sales_rep_id() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.current_sales_rep_role() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_sales_role(text[]) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_admin_user() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_clinic_setter_user() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_clinic_user_for(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_dashboard_stats() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.normalize_phone(text) FROM anon, public;

-- 6. Set search_path on pgmq email helpers
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
