DO $$
DECLARE
  v_thread_id uuid;
  v_message_id uuid := '2063f475-2d38-48cd-9726-c99bb2905558';
BEGIN
  SELECT id INTO v_thread_id
  FROM public.sms_threads
  WHERE phone_normalized = public.normalize_phone('+61452025559')
  ORDER BY last_message_at DESC NULLS LAST, created_at DESC
  LIMIT 1;

  IF v_thread_id IS NOT NULL THEN
    UPDATE public.sms_messages
    SET thread_id = v_thread_id
    WHERE id = v_message_id
      AND thread_id IS NULL;

    UPDATE public.sms_threads AS t
    SET last_message_preview = left(COALESCE(NULLIF(m.body, ''), '📷 Media'), 500),
        last_message_at = m.created_at,
        last_direction = m.direction,
        updated_at = now()
    FROM public.sms_messages AS m
    WHERE t.id = v_thread_id
      AND m.id = v_message_id;
  END IF;
END $$;