UPDATE clinic_appointments
SET deposit_amount = 75,
    stripe_payment_intent_id = 'pi_3TYf6g27stmLtYpS1A0cIYfc',
    updated_at = now()
WHERE id = '6720fcef-d692-42bd-85d6-ed09ec0bb393'
  AND deposit_amount IS NULL;