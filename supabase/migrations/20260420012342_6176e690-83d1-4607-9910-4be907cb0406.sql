
-- Indexes to speed up dashboard / clinics / clients queries
CREATE INDEX IF NOT EXISTS idx_call_records_called_at ON public.call_records (called_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_records_client_id ON public.call_records (client_id);
CREATE INDEX IF NOT EXISTS idx_contract_logs_created_at ON public.contract_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clinics_created_at ON public.clinics (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clinics_next_follow_up ON public.clinics (next_follow_up);
CREATE INDEX IF NOT EXISTS idx_clinic_contacts_clinic_id ON public.clinic_contacts (clinic_id);

-- Single-call dashboard stats RPC
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_contacts integer;
  v_calls_this_week integer;
  v_contracts_sent integer;
  v_recent_calls jsonb;
  v_recent_contracts jsonb;
  v_follow_ups jsonb;
BEGIN
  SELECT count(*) INTO v_total_contacts FROM public.clients;
  SELECT count(*) INTO v_calls_this_week
    FROM public.call_records
    WHERE called_at >= (now() - interval '7 days');
  SELECT count(*) INTO v_contracts_sent FROM public.contract_logs;

  SELECT coalesce(jsonb_agg(row_to_json(r)), '[]'::jsonb) INTO v_recent_calls
  FROM (
    SELECT cr.id, cr.status, cr.called_at, cr.duration, cr.client_id,
           cl.name AS client_name
    FROM public.call_records cr
    LEFT JOIN public.clients cl ON cl.id = cr.client_id
    ORDER BY cr.called_at DESC
    LIMIT 8
  ) r;

  SELECT coalesce(jsonb_agg(row_to_json(r)), '[]'::jsonb) INTO v_recent_contracts
  FROM (
    SELECT id, clinic_name, created_at
    FROM public.contract_logs
    ORDER BY created_at DESC
    LIMIT 8
  ) r;

  SELECT coalesce(jsonb_agg(row_to_json(r)), '[]'::jsonb) INTO v_follow_ups
  FROM (
    SELECT id, clinic_name, phone, next_follow_up
    FROM public.clinics
    WHERE next_follow_up IS NOT NULL
      AND next_follow_up <= current_date
    ORDER BY next_follow_up ASC
    LIMIT 5
  ) r;

  RETURN jsonb_build_object(
    'total_contacts', v_total_contacts,
    'calls_this_week', v_calls_this_week,
    'contracts_sent', v_contracts_sent,
    'recent_calls', v_recent_calls,
    'recent_contracts', v_recent_contracts,
    'follow_ups', v_follow_ups
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_dashboard_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO authenticated;
