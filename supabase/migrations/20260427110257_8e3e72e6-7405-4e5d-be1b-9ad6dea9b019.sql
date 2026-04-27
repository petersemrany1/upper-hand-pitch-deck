ALTER TABLE public.sales_reps
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text;

-- Backfill first/last from existing name where possible
UPDATE public.sales_reps
SET first_name = COALESCE(first_name, split_part(name, ' ', 1)),
    last_name  = COALESCE(last_name, NULLIF(regexp_replace(name, '^\S+\s*', ''), ''))
WHERE first_name IS NULL OR last_name IS NULL;