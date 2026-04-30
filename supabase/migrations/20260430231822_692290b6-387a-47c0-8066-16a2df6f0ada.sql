UPDATE public.sms_messages
SET thread_id = '3194bd17-08eb-46c9-89df-46c648fb1492'
WHERE id = 'c15b3e9a-d0e4-4b0b-8236-80847dc315fe'
  AND thread_id IS NULL;

UPDATE public.sms_threads
SET last_message_preview = 'Hi Sam, this is a confirmation of your upcoming appointment...',
    last_message_at = (SELECT created_at FROM public.sms_messages WHERE id = 'c15b3e9a-d0e4-4b0b-8236-80847dc315fe'),
    last_direction = 'outbound',
    updated_at = now()
WHERE id = '3194bd17-08eb-46c9-89df-46c648fb1492';