ALTER VIEW public.clinic_effective_rate SET (security_invoker = true);

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
           sum(COALESCE(p.free_shows_included, 0))::bigint AS shows_free_purchased,
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