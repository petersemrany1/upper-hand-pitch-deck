-- Phase 7: scale the lead pipeline to 50k+ rows.
--
-- 1. Indexes for the hot paths (queue ordering, callback lookups, keyset
--    pagination, per-lead call history).
-- 2. get_rep_queue(): the rep working queue computed IN POSTGRES with the
--    locked product ordering — callbacks due ALWAYS first (soonest first),
--    then new leads newest-first, then the rest. Cursor-paginated so the
--    dialler fetches the top-N that actually matter instead of a
--    newest-created window (which would miss due callbacks on old leads).

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_meta_leads_callback_due
  ON public.meta_leads (callback_scheduled_at)
  WHERE callback_scheduled_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_meta_leads_created_desc
  ON public.meta_leads (created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_meta_leads_status
  ON public.meta_leads (status);

CREATE INDEX IF NOT EXISTS idx_meta_leads_rep
  ON public.meta_leads (rep_id);

CREATE INDEX IF NOT EXISTS idx_call_records_lead_called
  ON public.call_records (lead_id, called_at DESC)
  WHERE lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_call_records_called_at
  ON public.call_records (called_at DESC);

-- ---------------------------------------------------------------------------
-- Rep queue RPC
-- ---------------------------------------------------------------------------
-- Buckets (mirrors src/components/sales-call/logic.ts buildQueueOrder):
--   0  callback due (scheduled <= now, or scheduled later today)  → soonest first
--   1  new lead (status ~ new)                                    → newest first
--   2  had_convo / chase-up                                       → newest first
--   3  everything else still workable                             → newest first
-- Excluded: not interested / deposit paid / no sale / cancelled / no_show /
-- dropped (closed-out statuses never enter the queue).
--
-- sort_key encodes per-bucket direction so one ORDER BY works for keyset
-- pagination: bucket 0 sorts by callback time ASC (epoch), the rest sort
-- newest-first via negated created_at epoch.
--
-- SECURITY INVOKER: RLS on meta_leads applies to the calling rep.

CREATE OR REPLACE FUNCTION public.get_rep_queue(
  p_limit int DEFAULT 100,
  p_cursor_bucket int DEFAULT NULL,
  p_cursor_key double precision DEFAULT NULL,
  p_cursor_id uuid DEFAULT NULL
)
RETURNS TABLE (
  lead public.meta_leads,
  bucket int,
  sort_key double precision
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH scored AS (
    SELECT
      m AS lead,
      CASE
        WHEN m.callback_scheduled_at IS NOT NULL
             AND (m.callback_scheduled_at <= now()
                  OR m.callback_scheduled_at::date = (now() AT TIME ZONE 'Australia/Sydney')::date)
          THEN 0
        WHEN lower(coalesce(m.status, 'new')) IN ('new', '') THEN 1
        WHEN lower(coalesce(m.status, '')) LIKE '%chase%'
             OR lower(coalesce(m.status, '')) LIKE '%had_convo%' THEN 2
        ELSE 3
      END AS bucket,
      m.id AS lead_id,
      m.callback_scheduled_at,
      m.created_at
    FROM public.meta_leads m
    WHERE
      -- closed-out statuses never enter the queue
      lower(coalesce(m.status, '')) NOT LIKE '%not_interested%'
      AND lower(coalesce(m.status, '')) NOT LIKE '%not interested%'
      AND lower(coalesce(m.status, '')) NOT LIKE '%deposit_paid%'
      AND lower(coalesce(m.status, '')) NOT LIKE '%deposit paid%'
      AND lower(coalesce(m.status, '')) NOT LIKE '%no_sale%'
      AND lower(coalesce(m.status, '')) NOT LIKE '%no sale%'
      AND lower(coalesce(m.status, '')) NOT IN ('cancelled', 'no_show', 'dropped', 'ineligible')
  ),
  keyed AS (
    SELECT
      lead,
      bucket,
      CASE
        WHEN bucket = 0 THEN extract(epoch FROM callback_scheduled_at)
        ELSE -extract(epoch FROM created_at)
      END AS sort_key,
      lead_id
    FROM scored
  )
  SELECT lead, bucket, sort_key
  FROM keyed
  WHERE
    p_cursor_bucket IS NULL
    OR (bucket, sort_key, lead_id) > (p_cursor_bucket, p_cursor_key, p_cursor_id)
  ORDER BY bucket, sort_key, lead_id
  LIMIT greatest(1, least(p_limit, 500));
$$;

REVOKE EXECUTE ON FUNCTION public.get_rep_queue(int, int, double precision, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_rep_queue(int, int, double precision, uuid) TO authenticated;
