-- One shared lead pool (2026-09-08)
--
-- Since 2026-06-04 reps could only see leads stamped with their own name,
-- and the old auto-assign switch stamped every new enquiry on one rep. A
-- new rep therefore saw one lead and her session ended instantly. The
-- agreed model is one pool: whoever is dialling takes the next lead, and a
-- rep is stamped on a lead only when they book it.

-- 1. Reps see and work every lead, like admins.
DROP POLICY IF EXISTS "Reps read own meta_leads" ON public.meta_leads;
DROP POLICY IF EXISTS "Reps update own meta_leads" ON public.meta_leads;

CREATE POLICY "Reps read all meta_leads"
  ON public.meta_leads FOR SELECT TO authenticated
  USING (public.has_sales_role(ARRAY['rep'::text]));

CREATE POLICY "Reps update all meta_leads"
  ON public.meta_leads FOR UPDATE TO authenticated
  USING (public.has_sales_role(ARRAY['rep'::text]))
  WITH CHECK (public.has_sales_role(ARRAY['rep'::text]));

-- 2. Clear the auto-assign stamps. A lead keeps its rep only if that rep
--    booked it (an appointment exists); everything else goes back to the pool.
UPDATE public.meta_leads l
SET rep_id = NULL, updated_at = now()
WHERE l.rep_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.clinic_appointments a WHERE a.lead_id = l.id
  );
