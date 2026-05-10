ALTER TABLE public.clinic_blocked_slots
  ADD COLUMN IF NOT EXISTS recur_pattern text,
  ADD COLUMN IF NOT EXISTS recur_days_of_week int[],
  ADD COLUMN IF NOT EXISTS recur_day_of_month int,
  ADD COLUMN IF NOT EXISTS recur_nth_week int,
  ADD COLUMN IF NOT EXISTS recur_until date;

-- Backfill existing recurring rows to the new "weekly" pattern
UPDATE public.clinic_blocked_slots
SET recur_pattern = 'weekly',
    recur_days_of_week = ARRAY[recur_day_of_week]
WHERE is_recurring = true
  AND recur_pattern IS NULL
  AND recur_day_of_week IS NOT NULL;