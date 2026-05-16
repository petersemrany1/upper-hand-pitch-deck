-- Helper: resolve current user's sales_reps.id by email
CREATE OR REPLACE FUNCTION public.current_sales_rep_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sr.id
  FROM public.sales_reps sr
  WHERE lower(sr.email) = lower(auth.jwt() ->> 'email')
  LIMIT 1
$$;

-- Replace rep policies on meta_leads to match by sales_reps.id (resolved via email)
DROP POLICY IF EXISTS "Reps read own assigned meta_leads" ON public.meta_leads;
DROP POLICY IF EXISTS "Reps update own assigned meta_leads" ON public.meta_leads;

CREATE POLICY "Reps read own assigned meta_leads"
ON public.meta_leads
FOR SELECT
TO authenticated
USING (
  has_sales_role(ARRAY['rep'::text])
  AND rep_id = public.current_sales_rep_id()
);

CREATE POLICY "Reps update own assigned meta_leads"
ON public.meta_leads
FOR UPDATE
TO authenticated
USING (
  has_sales_role(ARRAY['rep'::text])
  AND rep_id = public.current_sales_rep_id()
)
WITH CHECK (
  has_sales_role(ARRAY['rep'::text])
  AND rep_id = public.current_sales_rep_id()
);