-- Preserve Boss Clinic's existing 60-minute consultations and 30-minute buffers.
-- This also protects direct updates and restores from older browser sessions.
-- No appointment, operating-hour, blocked-time or clinic row is rewritten.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.partner_clinics
    WHERE id = '9ac8fa05-c4b0-4faa-b519-f6a347956fb1'::uuid
      AND consultation_duration_minutes = 60 AND buffer_minutes = 30
  ) THEN
    RAISE EXCEPTION 'Boss Clinic must already have 60-minute consultations and a 30-minute buffer before locking its timing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.partner_clinics'::regclass
      AND conname = 'boss_clinic_consultation_buffer_locked'
  ) THEN
    ALTER TABLE public.partner_clinics
      ADD CONSTRAINT boss_clinic_consultation_buffer_locked
      CHECK (id <> '9ac8fa05-c4b0-4faa-b519-f6a347956fb1'::uuid
        OR (consultation_duration_minutes = 60 AND buffer_minutes = 30));
  END IF;
END $$;
