DROP POLICY IF EXISTS "quiz_questions readable" ON public.quiz_questions;
CREATE POLICY "quiz_questions readable" ON public.quiz_questions FOR SELECT TO authenticated
  USING ((SELECT public.is_admin_user()) OR (SELECT public.has_sales_role(ARRAY['admin'::text,'rep'::text])));
DROP POLICY IF EXISTS "read scorecard" ON public.scorecard_dimensions;
CREATE POLICY "read scorecard" ON public.scorecard_dimensions FOR SELECT TO authenticated
  USING ((SELECT public.is_admin_user()) OR (SELECT public.has_sales_role(ARRAY['admin'::text,'rep'::text])));
DROP POLICY IF EXISTS "read stages" ON public.call_stages;
CREATE POLICY "read stages" ON public.call_stages FOR SELECT TO authenticated
  USING ((SELECT public.is_admin_user()) OR (SELECT public.has_sales_role(ARRAY['admin'::text,'rep'::text])));
DROP POLICY IF EXISTS "Authenticated read app_settings" ON public.app_settings;
CREATE POLICY "Authenticated read app_settings" ON public.app_settings FOR SELECT TO authenticated
  USING ((SELECT public.is_admin_user()) OR (SELECT public.has_sales_role(ARRAY['admin'::text,'rep'::text])));