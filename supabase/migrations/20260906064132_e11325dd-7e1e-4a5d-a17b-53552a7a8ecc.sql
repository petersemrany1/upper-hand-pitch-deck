ALTER TABLE public.clinic_packs
  ADD COLUMN IF NOT EXISTS free_shows_included integer NOT NULL DEFAULT 0;

-- Free shows sitting inside paid packs
UPDATE public.clinic_packs SET free_shows_included = 5 WHERE id IN ('bffd0e0f-04f0-4730-a50f-a32c35ac799b','7821fdea-432c-4cc3-a05e-a10a1dde0bd7');
UPDATE public.clinic_packs SET free_shows_included = 1 WHERE id IN ('65a45807-852d-4763-8230-02a20207a50c','cea7eda0-5a9c-423a-a995-b855a09c32ce','7285ba65-ff61-47b1-ae5a-08dca611ad69','26ca2369-1962-48f6-8cf9-4175a038483f');

-- Marzola never went ahead
DELETE FROM public.clinic_appointments WHERE clinic_id = '515a12e5-ab9a-4f53-8e5f-e6d9a1691559';
DELETE FROM public.partner_doctors WHERE clinic_id = '515a12e5-ab9a-4f53-8e5f-e6d9a1691559';
DELETE FROM public.clinic_packs WHERE clinic_id = '515a12e5-ab9a-4f53-8e5f-e6d9a1691559';
DELETE FROM public.partner_clinics WHERE id = '515a12e5-ab9a-4f53-8e5f-e6d9a1691559';

-- Rate per show = money paid / all shows in the packs (free shows included),
-- and never recognise more revenue than the clinic actually paid: dividing by
-- GREATEST(purchased, delivered) caps revenue at the money received.
DROP VIEW IF EXISTS public.clinic_effective_rate;
CREATE VIEW public.clinic_effective_rate AS
SELECT c.id AS clinic_id,
       COALESCE(pk.amount_paid, 0::numeric) AS amount_paid_ex_gst,
       COALESCE(pk.shows_purchased, 0::bigint) AS shows_purchased,
       COALESCE(sh.shows_delivered, 0::bigint) AS shows_delivered,
       CASE
         WHEN GREATEST(COALESCE(pk.shows_purchased, 0::bigint), COALESCE(sh.shows_delivered, 0::bigint)) > 0
           THEN COALESCE(pk.amount_paid, 0::numeric)
                / GREATEST(COALESCE(pk.shows_purchased, 0::bigint), COALESCE(sh.shows_delivered, 0::bigint))::numeric
         ELSE NULL::numeric
       END AS effective_rate,
       COALESCE(c.price_per_booking, 800::numeric) AS list_rate
FROM public.partner_clinics c
LEFT JOIN (
  SELECT clinic_id,
         sum(COALESCE(amount_paid_ex_gst, 0::numeric)) AS amount_paid,
         sum(GREATEST(pack_size, 0))::bigint AS shows_purchased
  FROM public.clinic_packs GROUP BY clinic_id
) pk ON pk.clinic_id = c.id
LEFT JOIN (
  SELECT clinic_id, count(*) AS shows_delivered
  FROM public.clinic_show_slots GROUP BY clinic_id
) sh ON sh.clinic_id = c.id;

CREATE OR REPLACE FUNCTION public.clinic_pack_economics()
 RETURNS TABLE(clinic_id uuid, clinic_name text, city text, shows_purchased bigint,
   shows_paid_purchased bigint, shows_free_purchased bigint, amount_paid_ex_gst numeric,
   packs_missing_amount bigint, shows_delivered bigint, free_shows_delivered bigint,
   effective_rate numeric, paid_rate numeric, shows_owed bigint, value_owed numeric,
   over_delivered bigint, list_rate numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  WITH packs AS (
    SELECT p.clinic_id,
           sum(p.pack_size)::bigint AS shows_purchased,
           sum(GREATEST(p.pack_size - COALESCE(p.free_shows_included, 0), 0))
             FILTER (WHERE p.pack_type = 'paid')::bigint AS shows_paid_purchased,
           (sum(COALESCE(p.free_shows_included, 0))
             + COALESCE(sum(p.pack_size) FILTER (WHERE p.pack_type = 'free_trial'), 0))::bigint AS shows_free_purchased,
           sum(COALESCE(p.amount_paid_ex_gst, 0)) AS amount_paid_ex_gst,
           count(*) FILTER (WHERE p.pack_type = 'paid' AND p.amount_paid_ex_gst IS NULL)::bigint AS packs_missing_amount
    FROM public.clinic_packs p
    GROUP BY 1
  ),
  shows AS (
    SELECT s.clinic_id,
           count(*)::bigint AS shows_delivered,
           count(*) FILTER (WHERE s.is_free)::bigint AS free_shows_delivered
    FROM public.clinic_show_slots s
    GROUP BY 1
  )
  SELECT c.id,
         c.clinic_name,
         c.city,
         COALESCE(pk.shows_purchased, 0),
         COALESCE(pk.shows_paid_purchased, 0),
         COALESCE(pk.shows_free_purchased, 0),
         COALESCE(pk.amount_paid_ex_gst, 0),
         COALESCE(pk.packs_missing_amount, 0),
         COALESCE(sh.shows_delivered, 0),
         COALESCE(sh.free_shows_delivered, 0),
         er.effective_rate,
         er.effective_rate AS paid_rate,
         GREATEST(0, COALESCE(pk.shows_purchased, 0) - COALESCE(sh.shows_delivered, 0))::bigint,
         GREATEST(0, COALESCE(pk.shows_purchased, 0) - COALESCE(sh.shows_delivered, 0))
           * COALESCE(er.effective_rate, 0),
         GREATEST(0, COALESCE(sh.shows_delivered, 0) - COALESCE(pk.shows_purchased, 0))::bigint,
         COALESCE(c.price_per_booking, 800)
  FROM public.partner_clinics c
  LEFT JOIN packs pk ON pk.clinic_id = c.id
  LEFT JOIN shows sh ON sh.clinic_id = c.id
  LEFT JOIN public.clinic_effective_rate er ON er.clinic_id = c.id
  ORDER BY c.clinic_name
$function$;