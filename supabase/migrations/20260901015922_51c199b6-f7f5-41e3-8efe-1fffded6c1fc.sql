ALTER TABLE public.meta_leads
  ADD COLUMN IF NOT EXISTS payment_processor text,
  ADD COLUMN IF NOT EXISTS square_payment_id text,
  ADD COLUMN IF NOT EXISTS square_order_id text,
  ADD COLUMN IF NOT EXISTS deposit_token uuid;

ALTER TABLE public.clinic_appointments
  ADD COLUMN IF NOT EXISTS payment_processor text,
  ADD COLUMN IF NOT EXISTS square_payment_id text,
  ADD COLUMN IF NOT EXISTS square_refund_id text;

ALTER TABLE public.meta_leads
  DROP CONSTRAINT IF EXISTS meta_leads_payment_processor_chk;
ALTER TABLE public.meta_leads
  ADD CONSTRAINT meta_leads_payment_processor_chk
  CHECK (payment_processor IS NULL OR payment_processor IN ('stripe','square'));

ALTER TABLE public.clinic_appointments
  DROP CONSTRAINT IF EXISTS clinic_appointments_payment_processor_chk;
ALTER TABLE public.clinic_appointments
  ADD CONSTRAINT clinic_appointments_payment_processor_chk
  CHECK (payment_processor IS NULL OR payment_processor IN ('stripe','square'));

UPDATE public.meta_leads
   SET payment_processor = 'stripe'
 WHERE payment_processor IS NULL
   AND (deposit_paid_at IS NOT NULL OR stripe_payment_intent_id IS NOT NULL);

UPDATE public.clinic_appointments
   SET payment_processor = 'stripe'
 WHERE payment_processor IS NULL
   AND stripe_payment_intent_id IS NOT NULL;

UPDATE public.meta_leads SET deposit_token = gen_random_uuid() WHERE deposit_token IS NULL;
ALTER TABLE public.meta_leads ALTER COLUMN deposit_token SET DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS meta_leads_deposit_token_key
  ON public.meta_leads (deposit_token);
CREATE INDEX IF NOT EXISTS meta_leads_square_payment_id_idx
  ON public.meta_leads (square_payment_id) WHERE square_payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS clinic_appointments_square_refund_id_idx
  ON public.clinic_appointments (square_refund_id) WHERE square_refund_id IS NOT NULL;