
DROP POLICY IF EXISTS "Authenticated read error_logs" ON public.error_logs;
DROP POLICY IF EXISTS "Authenticated update error_logs" ON public.error_logs;
DROP POLICY IF EXISTS "Authenticated delete error_logs" ON public.error_logs;

CREATE POLICY "Admins can view error_logs"
  ON public.error_logs FOR SELECT
  TO authenticated
  USING (public.is_admin_user());

CREATE POLICY "Admins can update error_logs"
  ON public.error_logs FOR UPDATE
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

CREATE POLICY "Admins can delete error_logs"
  ON public.error_logs FOR DELETE
  TO authenticated
  USING (public.is_admin_user());
