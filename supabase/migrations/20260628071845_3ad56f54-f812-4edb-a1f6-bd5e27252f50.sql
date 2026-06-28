ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS owner_title text,
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS owner_name_suggested text,
  ADD COLUMN IF NOT EXISTS owner_title_suggested text,
  ADD COLUMN IF NOT EXISTS linkedin_url_suggested text,
  ADD COLUMN IF NOT EXISTS owner_source_url text,
  ADD COLUMN IF NOT EXISTS owner_confidence text,
  ADD COLUMN IF NOT EXISTS owner_enriched_at timestamptz,
  ADD COLUMN IF NOT EXISTS owner_enrichment_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS owner_enrichment_raw jsonb;