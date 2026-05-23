UPDATE public.meta_leads
SET status = 'booked_deposit_paid',
    updated_at = now()
WHERE id = 'ea083474-3b5a-43f2-848f-00484123c77d'
  AND booking_date IS NOT NULL
  AND booking_time IS NOT NULL
  AND (deposit_paid_at IS NOT NULL OR stripe_payment_intent_id IS NOT NULL);