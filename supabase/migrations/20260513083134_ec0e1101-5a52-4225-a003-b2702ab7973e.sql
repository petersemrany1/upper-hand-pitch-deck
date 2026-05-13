ALTER TABLE public.sales_reps
  DROP CONSTRAINT IF EXISTS sales_reps_role_check;

ALTER TABLE public.sales_reps
  ADD CONSTRAINT sales_reps_role_check
  CHECK (role = ANY (ARRAY['admin'::text, 'rep'::text, 'caller'::text, 'clinic_setter'::text]));