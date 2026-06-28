
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS owner_email text,
  ADD COLUMN IF NOT EXISTS owner_email_suggested text,
  ADD COLUMN IF NOT EXISTS owner_linkedin_suggested text,
  ADD COLUMN IF NOT EXISTS contact_source_url text,
  ADD COLUMN IF NOT EXISTS contact_confidence text,
  ADD COLUMN IF NOT EXISTS contact_enrichment_status text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS contact_enriched_at timestamptz,
  ADD COLUMN IF NOT EXISTS contact_enrichment_raw jsonb;
