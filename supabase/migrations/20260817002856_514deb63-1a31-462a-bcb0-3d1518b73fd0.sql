CREATE INDEX IF NOT EXISTS idx_call_records_direction_called_at ON public.call_records (direction, called_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_records_lead_id_called_at ON public.call_records (lead_id, called_at);
CREATE INDEX IF NOT EXISTS idx_meta_leads_rep_id ON public.meta_leads (rep_id);
CREATE INDEX IF NOT EXISTS idx_meta_leads_created_at ON public.meta_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_status_last_used ON public.phone_numbers (status, last_used_at);
ANALYZE public.call_records;
ANALYZE public.meta_leads;