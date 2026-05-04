ALTER TABLE public.meta_leads
  ADD COLUMN IF NOT EXISTS pipeline_summary TEXT,
  ADD COLUMN IF NOT EXISTS pipeline_summary_updated_at TIMESTAMPTZ;