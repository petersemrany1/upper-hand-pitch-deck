ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS letter_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS letter_sent_at timestamptz NULL;