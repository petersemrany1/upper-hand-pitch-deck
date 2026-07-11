UPDATE public.sms_messages
SET thread_id = 'f281c125-42fe-4cd4-a141-83281b7fd128'
WHERE id = 'bbc94370-8dcc-4b3a-ac4f-5e7e03e90a84';

UPDATE public.sms_threads
SET last_message_at = '2026-07-11 04:59:24.516966+00',
    last_message_preview = 'Hi Arokia, here''s the link to pay your $75 refundable consultation deposit: https://checkout.stripe.com/c/pay/cs_live_a1d7Uy6BYy2xLTpsd2iUsInMaEnSxdgmO8UIN4Odakm5c7UEf00he6fDQg',
    last_direction = 'outbound',
    updated_at = now()
WHERE id = 'f281c125-42fe-4cd4-a141-83281b7fd128';