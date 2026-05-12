UPDATE public.call_records cr
SET rep_id = ml.rep_id
FROM public.meta_leads ml
WHERE cr.lead_id = ml.id
  AND cr.rep_id IS NULL
  AND ml.rep_id IS NOT NULL;