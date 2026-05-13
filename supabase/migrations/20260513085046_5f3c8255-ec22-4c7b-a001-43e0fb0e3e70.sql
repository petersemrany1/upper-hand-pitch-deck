DROP POLICY IF EXISTS "Authenticated read sales_reps" ON public.sales_reps;
DROP POLICY IF EXISTS "Authenticated insert sales_reps" ON public.sales_reps;
DROP POLICY IF EXISTS "Authenticated update sales_reps" ON public.sales_reps;
DROP POLICY IF EXISTS "Authenticated delete sales_reps" ON public.sales_reps;

CREATE POLICY "Users read own sales_rep row and admins read all"
ON public.sales_reps
FOR SELECT
TO authenticated
USING (
  lower(email) = lower(auth.jwt() ->> 'email')
  OR public.has_sales_role(ARRAY['admin'])
);

CREATE POLICY "Admins insert sales_reps"
ON public.sales_reps
FOR INSERT
TO authenticated
WITH CHECK (public.has_sales_role(ARRAY['admin']));

CREATE POLICY "Admins update sales_reps"
ON public.sales_reps
FOR UPDATE
TO authenticated
USING (public.has_sales_role(ARRAY['admin']))
WITH CHECK (public.has_sales_role(ARRAY['admin']));

CREATE POLICY "Admins delete sales_reps"
ON public.sales_reps
FOR DELETE
TO authenticated
USING (public.has_sales_role(ARRAY['admin']));