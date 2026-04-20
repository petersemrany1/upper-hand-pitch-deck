ALTER TABLE public.call_records
  ADD COLUMN IF NOT EXISTS analysis_stage text;