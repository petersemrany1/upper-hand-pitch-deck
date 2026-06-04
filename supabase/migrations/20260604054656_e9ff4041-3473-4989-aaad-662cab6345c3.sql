
DROP POLICY IF EXISTS "Reps read all meta_leads" ON public.meta_leads;
DROP POLICY IF EXISTS "Reps update all meta_leads" ON public.meta_leads;

CREATE POLICY "Reps read own meta_leads"
  ON public.meta_leads FOR SELECT
  USING (has_sales_role(ARRAY['rep'::text]) AND rep_id = current_sales_rep_id());

CREATE POLICY "Reps update own meta_leads"
  ON public.meta_leads FOR UPDATE
  USING (has_sales_role(ARRAY['rep'::text]) AND rep_id = current_sales_rep_id())
  WITH CHECK (has_sales_role(ARRAY['rep'::text]) AND rep_id = current_sales_rep_id());
