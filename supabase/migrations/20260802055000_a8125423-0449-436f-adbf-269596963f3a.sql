ALTER TABLE public.clinicflow_pipeline_status
  ADD COLUMN IF NOT EXISTS next_followup_date date,
  ADD COLUMN IF NOT EXISTS next_followup_note text;