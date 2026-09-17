ALTER TABLE public.meta_leads
  ADD COLUMN IF NOT EXISTS norwood_level smallint,
  ADD COLUMN IF NOT EXISTS expectations_set boolean,
  ADD COLUMN IF NOT EXISTS expectations_set_by uuid,
  ADD COLUMN IF NOT EXISTS expectations_set_at timestamptz;

ALTER TABLE public.clinic_appointments
  ADD COLUMN IF NOT EXISTS norwood_level smallint,
  ADD COLUMN IF NOT EXISTS expectations_set boolean;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meta_leads_norwood_level_range') THEN
    ALTER TABLE public.meta_leads ADD CONSTRAINT meta_leads_norwood_level_range CHECK (norwood_level IS NULL OR (norwood_level BETWEEN 1 AND 7));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clinic_appointments_norwood_level_range') THEN
    ALTER TABLE public.clinic_appointments ADD CONSTRAINT clinic_appointments_norwood_level_range CHECK (norwood_level IS NULL OR (norwood_level BETWEEN 1 AND 7));
  END IF;
END $$;