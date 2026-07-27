ALTER TABLE public.meta_leads
  ADD COLUMN IF NOT EXISTS previous_lead_id uuid REFERENCES public.meta_leads(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS meta_leads_previous_lead_id_idx ON public.meta_leads(previous_lead_id);

-- Backfill: link each lead to the most recent older lead that shares phone-tail-9 or email.
WITH matches AS (
  SELECT
    n.id AS new_id,
    o.id AS old_id,
    ROW_NUMBER() OVER (PARTITION BY n.id ORDER BY o.created_at DESC) AS rn
  FROM public.meta_leads n
  JOIN public.meta_leads o
    ON o.id <> n.id
   AND o.created_at < n.created_at
   AND (
     (
       n.phone IS NOT NULL AND o.phone IS NOT NULL
       AND length(regexp_replace(n.phone, '[^0-9]', '', 'g')) >= 9
       AND length(regexp_replace(o.phone, '[^0-9]', '', 'g')) >= 9
       AND right(regexp_replace(n.phone, '[^0-9]', '', 'g'), 9)
         = right(regexp_replace(o.phone, '[^0-9]', '', 'g'), 9)
     )
     OR (
       n.email IS NOT NULL AND o.email IS NOT NULL
       AND lower(n.email) = lower(o.email)
     )
   )
)
UPDATE public.meta_leads m
   SET previous_lead_id = matches.old_id
  FROM matches
 WHERE matches.new_id = m.id
   AND matches.rn = 1
   AND m.previous_lead_id IS NULL;