ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS consult_includes text,
  ADD COLUMN IF NOT EXISTS consult_price_original numeric,
  ADD COLUMN IF NOT EXISTS consult_price_deposit numeric,
  ADD COLUMN IF NOT EXISTS consult_price_free boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consult_persuasion_lines jsonb NOT NULL DEFAULT '[]'::jsonb;