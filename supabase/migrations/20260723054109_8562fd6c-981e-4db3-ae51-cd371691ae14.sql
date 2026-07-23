ALTER TABLE public.clinic_appointments ADD COLUMN IF NOT EXISTS patient_email text;
UPDATE public.clinic_appointments ca
SET patient_email = ml.email
FROM public.meta_leads ml
WHERE ca.lead_id = ml.id
  AND ca.patient_email IS NULL
  AND ml.email IS NOT NULL;