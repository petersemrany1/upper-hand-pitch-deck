ALTER TABLE public.clinic_packs
  ADD COLUMN IF NOT EXISTS pack_name text,
  ADD COLUMN IF NOT EXISTS amount_paid_ex_gst numeric,
  ADD COLUMN IF NOT EXISTS date_paid date,
  ADD COLUMN IF NOT EXISTS pack_type text NOT NULL DEFAULT 'paid';

ALTER TABLE public.clinic_packs
  DROP CONSTRAINT IF EXISTS clinic_packs_pack_type_check;
ALTER TABLE public.clinic_packs
  ADD CONSTRAINT clinic_packs_pack_type_check
  CHECK (pack_type IN ('paid','free_trial','guarantee_credit','goodwill'));

INSERT INTO public.partner_clinics (clinic_name, city, state, is_active, price_per_booking)
SELECT 'Perth Hair Clinic', 'Perth', 'WA', true, 800
WHERE NOT EXISTS (
  SELECT 1 FROM public.partner_clinics WHERE lower(clinic_name) = 'perth hair clinic'
);

CREATE OR REPLACE FUNCTION public.clinic_pack_economics()
RETURNS TABLE(
  clinic_id uuid,
  clinic_name text,
  city text,
  shows_purchased bigint,
  shows_paid_purchased bigint,
  shows_free_purchased bigint,
  amount_paid_ex_gst numeric,
  packs_missing_amount bigint,
  shows_delivered bigint,
  free_shows_delivered bigint,
  effective_rate numeric,
  over_delivered bigint
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  WITH packs AS (
    SELECT p.clinic_id,
           sum(p.pack_size)::bigint AS shows_purchased,
           sum(CASE WHEN p.pack_type = 'paid' THEN p.pack_size ELSE 0 END)::bigint AS shows_paid_purchased,
           sum(CASE WHEN p.pack_type <> 'paid' THEN p.pack_size ELSE 0 END)::bigint AS shows_free_purchased,
           sum(COALESCE(p.amount_paid_ex_gst, 0)) AS amount_paid_ex_gst,
           count(*) FILTER (WHERE p.pack_type = 'paid' AND p.amount_paid_ex_gst IS NULL)::bigint AS packs_missing_amount
    FROM public.clinic_packs p
    GROUP BY 1
  ),
  shows AS (
    SELECT a.clinic_id, count(*)::bigint AS shows_delivered
    FROM public.clinic_appointments a
    WHERE a.outcome IN ('show','proceeded')
      AND a.patient_name NOT ILIKE '%test%'
    GROUP BY 1
  )
  SELECT c.id,
         c.clinic_name,
         c.city,
         COALESCE(p.shows_purchased, 0),
         COALESCE(p.shows_paid_purchased, 0),
         COALESCE(p.shows_free_purchased, 0),
         COALESCE(p.amount_paid_ex_gst, 0),
         COALESCE(p.packs_missing_amount, 0),
         COALESCE(s.shows_delivered, 0),
         LEAST(COALESCE(s.shows_delivered, 0), COALESCE(p.shows_free_purchased, 0)),
         CASE WHEN COALESCE(s.shows_delivered, 0) > 0
              THEN COALESCE(p.amount_paid_ex_gst, 0) / s.shows_delivered
              ELSE NULL END,
         GREATEST(0, COALESCE(s.shows_delivered, 0) - COALESCE(p.shows_purchased, 0))
  FROM public.partner_clinics c
  LEFT JOIN packs p ON p.clinic_id = c.id
  LEFT JOIN shows s ON s.clinic_id = c.id
$function$;