-- Runs in the LEGAL database (family-law-floater), not the Hair one.
-- Lets the Upper Hand portal show the Legal leaderboard with the viewer's own
-- Legal sign-in: returns the raw rows the Legal leaderboard server reads with
-- its service key. Staff only (Legal admins, or active admin/rep sales staff).

CREATE OR REPLACE FUNCTION public.portal_leaderboard_source(p_from timestamptz, p_to timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT (
    public.is_admin_user()
    OR EXISTS (
      SELECT 1 FROM public.sales_reps r
      WHERE r.user_id = auth.uid() AND r.is_active AND r.role IN ('admin', 'rep')
    )
  ) THEN
    RAISE EXCEPTION 'Staff only' USING ERRCODE = '42501';
  END IF;
  IF p_from IS NULL OR p_to IS NULL OR p_to < p_from OR p_to - p_from > interval '400 days' THEN
    RAISE EXCEPTION 'Invalid range' USING ERRCODE = '22023';
  END IF;

  WITH calls AS (
    SELECT c.id, c.rep_id, c.lead_id, c.direction, c.call_status, c.duration_seconds, c.created_at
    FROM public.call_records c
    WHERE c.created_at >= p_from AND c.created_at <= p_to
      AND coalesce(c.direction, 'outbound') <> 'inbound'
  ),
  appts AS (
    SELECT a.id, a.lead_id, a.status, a.created_at
    FROM public.firm_appointments a
    WHERE a.status <> 'cancelled' AND a.created_at >= p_from AND a.created_at <= p_to
  ),
  deposits AS (
    SELECT l.id, l.rep_id, l.deposit_paid_at
    FROM public.client_leads l
    WHERE l.deposit_paid_at >= p_from AND l.deposit_paid_at <= p_to
  ),
  lead_ids AS (
    SELECT lead_id AS id FROM calls WHERE lead_id IS NOT NULL
    UNION SELECT lead_id FROM appts WHERE lead_id IS NOT NULL
    UNION SELECT id FROM deposits
  )
  SELECT jsonb_build_object(
    'reps', (SELECT coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) FROM (
      SELECT id, name, email, role, is_active, created_at FROM public.sales_reps WHERE is_active
    ) r),
    'calls', (SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.created_at), '[]'::jsonb) FROM calls c),
    'appts', (SELECT coalesce(jsonb_agg(to_jsonb(a)), '[]'::jsonb) FROM appts a),
    'deposits', (SELECT coalesce(jsonb_agg(to_jsonb(d)), '[]'::jsonb) FROM deposits d),
    'leads', (SELECT coalesce(jsonb_agg(to_jsonb(l)), '[]'::jsonb) FROM (
      SELECT cl.id, cl.rep_id, cl.first_name, cl.last_name
      FROM public.client_leads cl JOIN lead_ids i ON i.id = cl.id
    ) l)
  ) INTO result;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.portal_leaderboard_source(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.portal_leaderboard_source(timestamptz, timestamptz) TO authenticated;
