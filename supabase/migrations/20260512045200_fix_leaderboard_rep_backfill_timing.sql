UPDATE public.call_records cr
SET rep_id = NULL
FROM public.sales_reps sr
WHERE cr.rep_id = sr.id
  AND cr.called_at < sr.created_at;
