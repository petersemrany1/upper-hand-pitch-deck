-- Keep lead screening's existing service role and SECURITY DEFINER trigger.
DROP POLICY IF EXISTS "Authenticated users can view blacklist" ON public.lead_blacklist;
DROP POLICY IF EXISTS "Authenticated users can add blacklist entries" ON public.lead_blacklist;
DROP POLICY IF EXISTS "Authenticated users can remove blacklist entries" ON public.lead_blacklist;
DROP POLICY IF EXISTS "Sales staff read lead blacklist" ON public.lead_blacklist;
CREATE POLICY "Sales staff read lead blacklist" ON public.lead_blacklist FOR SELECT TO authenticated
  USING ((SELECT public.is_admin_user()) OR (SELECT public.has_sales_role(ARRAY['admin','rep'])));
DROP POLICY IF EXISTS "Sales staff add lead blacklist entries" ON public.lead_blacklist;
CREATE POLICY "Sales staff add lead blacklist entries" ON public.lead_blacklist FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_admin_user()) OR (SELECT public.has_sales_role(ARRAY['admin','rep'])));
DROP POLICY IF EXISTS "Admins remove lead blacklist entries" ON public.lead_blacklist;
CREATE POLICY "Admins remove lead blacklist entries" ON public.lead_blacklist FOR DELETE TO authenticated
  USING ((SELECT public.is_admin_user()));

-- The existing admin and background-worker policies still cover team reporting.
DROP POLICY IF EXISTS "Authenticated users read rep_performance_jobs" ON public.rep_performance_jobs;
DROP POLICY IF EXISTS "Reps read their own performance jobs" ON public.rep_performance_jobs;
CREATE POLICY "Reps read their own performance jobs" ON public.rep_performance_jobs FOR SELECT TO authenticated
  USING (rep_id = (SELECT public.current_sales_rep_id()));

-- This legacy bucket is private. Its existing FOR ALL policies already allow
-- admins and members of the clinic named in the first folder to read its logos.
DROP POLICY IF EXISTS "clinicflow_logos_public_read" ON storage.objects;
