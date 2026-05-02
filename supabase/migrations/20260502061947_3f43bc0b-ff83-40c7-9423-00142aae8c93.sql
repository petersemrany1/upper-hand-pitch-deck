-- Add role column to sales_reps with check constraint
ALTER TABLE public.sales_reps
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'rep';

ALTER TABLE public.sales_reps
  DROP CONSTRAINT IF EXISTS sales_reps_role_check;

ALTER TABLE public.sales_reps
  ADD CONSTRAINT sales_reps_role_check CHECK (role IN ('admin', 'rep'));

-- Bootstrap Peter as admin
UPDATE public.sales_reps
   SET role = 'admin'
 WHERE lower(email) = lower('petersemrany1@gmail.com');