-- Add deposit payment tracking columns to meta_leads
ALTER TABLE public.meta_leads
  ADD COLUMN IF NOT EXISTS deposit_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS deposit_amount numeric,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text;

-- Index for webhook lookups by session id (idempotency check)
CREATE INDEX IF NOT EXISTS idx_meta_leads_stripe_session
  ON public.meta_leads (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

-- Index for fast "is deposit paid?" queries
CREATE INDEX IF NOT EXISTS idx_meta_leads_deposit_paid_at
  ON public.meta_leads (deposit_paid_at)
  WHERE deposit_paid_at IS NOT NULL;

-- Enable realtime so the Lock It In page sees the webhook update instantly
ALTER PUBLICATION supabase_realtime ADD TABLE public.meta_leads;

-- Set REPLICA IDENTITY FULL so realtime payload includes the full updated row
ALTER TABLE public.meta_leads REPLICA IDENTITY FULL;