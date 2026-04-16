
CREATE TABLE public.error_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  function_name TEXT NOT NULL,
  error_message TEXT NOT NULL,
  context JSONB DEFAULT '{}'::jsonb,
  resolved BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view error logs" ON public.error_logs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert error logs" ON public.error_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update error logs" ON public.error_logs FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete error logs" ON public.error_logs FOR DELETE USING (true);
