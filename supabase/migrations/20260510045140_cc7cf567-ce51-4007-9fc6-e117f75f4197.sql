
ALTER TABLE public.clinic_appointments
  ADD COLUMN IF NOT EXISTS deposit_amount numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS refund_status text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS refund_processed_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS stripe_refund_id text DEFAULT NULL;

DO $$ BEGIN
  ALTER TABLE public.clinic_appointments
    ADD CONSTRAINT clinic_appointments_refund_status_check
    CHECK (refund_status IS NULL OR refund_status IN ('refunded','failed'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
