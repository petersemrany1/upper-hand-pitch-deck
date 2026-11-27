-- Notification preferences are independent of phone-number ownership.
CREATE TABLE public.sms_notification_preferences (
  user_id uuid PRIMARY KEY,
  involved_only boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sms_notification_preferences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sms_notification_preferences FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.sms_notification_preferences TO authenticated;
GRANT ALL ON public.sms_notification_preferences TO service_role;
CREATE POLICY own_sms_notification_preferences ON public.sms_notification_preferences
  FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()));

-- Enable the requested alerts for Peter's verified existing account. No phone
-- numbers, conversations, messages or other users' preferences are changed.
INSERT INTO public.sms_notification_preferences(user_id,involved_only)
SELECT id,true FROM auth.users
WHERE id='d9db9a1a-1c88-4668-9aee-72e2f4c3e66f' AND lower(email)='petersemrany1@gmail.com';
