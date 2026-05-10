CREATE TABLE IF NOT EXISTS public.notification_acknowledgements (
  user_id uuid NOT NULL,
  notification_type text NOT NULL,
  notification_key text NOT NULL,
  acknowledged_at timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (user_id, notification_type, notification_key)
);

ALTER TABLE public.notification_acknowledgements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own notification acknowledgements" ON public.notification_acknowledgements;
CREATE POLICY "Users manage own notification acknowledgements"
ON public.notification_acknowledgements
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notification_acknowledgements_user_type
ON public.notification_acknowledgements (user_id, notification_type, acknowledged_at DESC);