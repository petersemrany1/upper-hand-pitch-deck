
-- 1. Delete duplicates, keep oldest row per lead_id
DELETE FROM public.clinic_appointments a
USING public.clinic_appointments b
WHERE a.lead_id IS NOT NULL
  AND a.lead_id = b.lead_id
  AND a.created_at > b.created_at;

-- 2. Enforce one appointment per lead
CREATE UNIQUE INDEX IF NOT EXISTS clinic_appointments_lead_unique
  ON public.clinic_appointments(lead_id)
  WHERE lead_id IS NOT NULL;
