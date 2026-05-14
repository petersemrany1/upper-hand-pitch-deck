-- Restrict reps to only their own assigned leads on meta_leads.
-- Admins keep full access.

DROP POLICY IF EXISTS "Admins and sales reps read meta_leads" ON public.meta_leads;
DROP POLICY IF EXISTS "Admins and sales reps update meta_leads" ON public.meta_leads;
DROP POLICY IF EXISTS "Admins and sales reps delete meta_leads" ON public.meta_leads;

CREATE POLICY "Admins read all meta_leads"
ON public.meta_leads FOR SELECT TO authenticated
USING (has_sales_role(ARRAY['admin'::text]));

CREATE POLICY "Reps read own assigned meta_leads"
ON public.meta_leads FOR SELECT TO authenticated
USING (has_sales_role(ARRAY['rep'::text]) AND rep_id = auth.uid());

CREATE POLICY "Admins update all meta_leads"
ON public.meta_leads FOR UPDATE TO authenticated
USING (has_sales_role(ARRAY['admin'::text]))
WITH CHECK (has_sales_role(ARRAY['admin'::text]));

CREATE POLICY "Reps update own assigned meta_leads"
ON public.meta_leads FOR UPDATE TO authenticated
USING (has_sales_role(ARRAY['rep'::text]) AND rep_id = auth.uid())
WITH CHECK (has_sales_role(ARRAY['rep'::text]) AND rep_id = auth.uid());

CREATE POLICY "Admins delete all meta_leads"
ON public.meta_leads FOR DELETE TO authenticated
USING (has_sales_role(ARRAY['admin'::text]));