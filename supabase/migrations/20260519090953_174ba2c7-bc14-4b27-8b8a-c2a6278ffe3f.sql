CREATE TABLE public.rep_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_id uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rep_sessions_open ON public.rep_sessions (rep_id, ended_at, started_at DESC);

ALTER TABLE public.rep_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reps read own sessions, admins read all"
ON public.rep_sessions
FOR SELECT
TO authenticated
USING (rep_id = public.current_sales_rep_id() OR public.has_sales_role(ARRAY['admin'::text]));

CREATE POLICY "Reps insert own sessions"
ON public.rep_sessions
FOR INSERT
TO authenticated
WITH CHECK (rep_id = public.current_sales_rep_id());

CREATE POLICY "Reps update own sessions, admins update all"
ON public.rep_sessions
FOR UPDATE
TO authenticated
USING (rep_id = public.current_sales_rep_id() OR public.has_sales_role(ARRAY['admin'::text]))
WITH CHECK (rep_id = public.current_sales_rep_id() OR public.has_sales_role(ARRAY['admin'::text]));