-- Numbers audit follow-ups (2026-09-08)
--
-- 1. 279 calls on 14 and 16 May 2026 were stamped with a placeholder rep id
--    that never existed in sales_reps. Peter made those calls.
-- 2. Four people are booked in the diary but their lead status never moved
--    to booked, so the dialler could ring them again. Correct the status,
--    and from now on any appointment created for a lead locks its status.

-- 1. -----------------------------------------------------------------------
UPDATE public.call_records
SET rep_id = COALESCE(
  (SELECT id FROM public.sales_reps WHERE name ILIKE '%peter%semrany%' ORDER BY created_at LIMIT 1),
  'd9db9a1a-1c88-4668-9aee-72e2f4c3e66f'::uuid
)
WHERE rep_id = 'f2ee814e-5f92-4792-9f7f-04a35ae5779b'::uuid;

-- 2. -----------------------------------------------------------------------
UPDATE public.meta_leads l
SET status = CASE WHEN l.deposit_paid_at IS NOT NULL THEN 'booked_deposit_paid' ELSE 'booked_no_deposit' END,
    updated_at = now()
WHERE EXISTS (
        SELECT 1 FROM public.clinic_appointments a
        WHERE a.lead_id = l.id AND COALESCE(a.outcome, '') <> 'disqualified'
      )
  AND lower(COALESCE(l.status, '')) NOT LIKE '%booked%'
  AND lower(COALESCE(l.status, '')) NOT LIKE '%deposit%';

CREATE OR REPLACE FUNCTION public.lock_lead_status_on_appointment()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.lead_id IS NULL THEN RETURN NEW; END IF;
  UPDATE public.meta_leads l
  SET status = CASE WHEN l.deposit_paid_at IS NOT NULL THEN 'booked_deposit_paid' ELSE 'booked_no_deposit' END,
      updated_at = now()
  WHERE l.id = NEW.lead_id
    AND lower(COALESCE(l.status, '')) NOT LIKE '%booked%'
    AND lower(COALESCE(l.status, '')) NOT LIKE '%deposit%';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lock_lead_status_on_appointment ON public.clinic_appointments;
CREATE TRIGGER lock_lead_status_on_appointment
  AFTER INSERT ON public.clinic_appointments
  FOR EACH ROW EXECUTE FUNCTION public.lock_lead_status_on_appointment();
