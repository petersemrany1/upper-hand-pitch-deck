ALTER TABLE public.meta_leads ADD COLUMN IF NOT EXISTS handover_sent_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_meta_leads_handover_gate
  ON public.meta_leads (id)
  WHERE deposit_paid_at IS NOT NULL AND handover_sent_at IS NULL;