ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS letter_campaign_column text;
ALTER TABLE public.clinics DROP CONSTRAINT IF EXISTS clinics_letter_campaign_column_check;
ALTER TABLE public.clinics ADD CONSTRAINT clinics_letter_campaign_column_check CHECK (letter_campaign_column IS NULL OR letter_campaign_column IN ('call','letter','research'));