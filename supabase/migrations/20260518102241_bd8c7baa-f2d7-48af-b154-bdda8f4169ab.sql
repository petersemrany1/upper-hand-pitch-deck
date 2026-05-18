CREATE TABLE public.rep_performance_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_id uuid NOT NULL,
  date_from date,
  date_to date,
  status text NOT NULL DEFAULT 'queued',
  total_eligible integer NOT NULL DEFAULT 0,
  calls_completed integer NOT NULL DEFAULT 0,
  report jsonb,
  call_summaries jsonb,
  error text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rep_performance_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage rep_performance_jobs"
ON public.rep_performance_jobs
FOR ALL
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

CREATE POLICY "Authenticated users read rep_performance_jobs"
ON public.rep_performance_jobs
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE TRIGGER rep_performance_jobs_updated_at
BEFORE UPDATE ON public.rep_performance_jobs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.rep_performance_jobs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rep_performance_jobs;

CREATE INDEX idx_rep_performance_jobs_rep ON public.rep_performance_jobs(rep_id, created_at DESC);