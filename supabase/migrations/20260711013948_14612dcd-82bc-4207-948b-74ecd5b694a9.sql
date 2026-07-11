DROP POLICY IF EXISTS "Admins read app_settings" ON public.app_settings;
CREATE POLICY "Authenticated read app_settings" ON public.app_settings FOR SELECT TO authenticated USING (true);