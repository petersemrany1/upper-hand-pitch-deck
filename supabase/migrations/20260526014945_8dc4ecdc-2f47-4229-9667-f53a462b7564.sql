DROP POLICY IF EXISTS "Reps read own assigned meta_leads" ON public.meta_leads;
DROP POLICY IF EXISTS "Reps update own assigned meta_leads" ON public.meta_leads;

CREATE POLICY "Reps read all meta_leads"
ON public.meta_leads
FOR SELECT
TO authenticated
USING (has_sales_role(ARRAY['rep'::text]));

CREATE POLICY "Reps update all meta_leads"
ON public.meta_leads
FOR UPDATE
TO authenticated
USING (has_sales_role(ARRAY['rep'::text]))
WITH CHECK (has_sales_role(ARRAY['rep'::text]));