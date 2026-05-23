UPDATE public.meta_leads
SET status = 'booked_deposit_paid',
    updated_at = now()
WHERE id = '5c3f517b-d5db-4e1a-a762-187f0480d3b6'
  AND booking_date IS NOT NULL
  AND booking_time IS NOT NULL
  AND (deposit_paid_at IS NOT NULL OR stripe_payment_intent_id IS NOT NULL);