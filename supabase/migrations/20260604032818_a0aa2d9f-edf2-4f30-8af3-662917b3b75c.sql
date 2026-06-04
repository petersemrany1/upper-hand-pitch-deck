
CREATE TABLE public.practice_call_recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rep_id UUID,
  conversation_id TEXT NOT NULL UNIQUE,
  audio_path TEXT NOT NULL,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.practice_call_recordings TO authenticated;
GRANT ALL ON public.practice_call_recordings TO service_role;

ALTER TABLE public.practice_call_recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reps view own recordings"
  ON public.practice_call_recordings FOR SELECT
  TO authenticated
  USING (rep_id = public.current_sales_rep_id() OR public.is_admin_user());

CREATE POLICY "Reps insert own recordings"
  ON public.practice_call_recordings FOR INSERT
  TO authenticated
  WITH CHECK (rep_id = public.current_sales_rep_id() OR public.is_admin_user());

CREATE POLICY "Admins manage recordings"
  ON public.practice_call_recordings FOR ALL
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- Storage policies on practice-call-recordings bucket. Path layout: {rep_id}/{conversation_id}.mp3
CREATE POLICY "Reps read own practice recordings"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'practice-call-recordings'
    AND (
      public.is_admin_user()
      OR (storage.foldername(name))[1] = public.current_sales_rep_id()::text
    )
  );

CREATE POLICY "Service role writes practice recordings"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'practice-call-recordings');
