CREATE TABLE public.practice_call_save_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id text NOT NULL UNIQUE,
  rep_id uuid REFERENCES public.sales_reps(id) ON DELETE SET NULL,
  duration_seconds integer,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  done_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT practice_call_save_queue_status_chk CHECK (status IN ('pending','done','failed'))
);

GRANT SELECT, INSERT, UPDATE ON public.practice_call_save_queue TO authenticated;
GRANT ALL ON public.practice_call_save_queue TO service_role;

ALTER TABLE public.practice_call_save_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reps insert their own queue rows"
  ON public.practice_call_save_queue
  FOR INSERT TO authenticated
  WITH CHECK (rep_id IS NULL OR rep_id = public.current_sales_rep_id());

CREATE POLICY "Reps read their own queue rows"
  ON public.practice_call_save_queue
  FOR SELECT TO authenticated
  USING (rep_id = public.current_sales_rep_id() OR public.is_admin_user());

CREATE INDEX practice_call_save_queue_pending_idx
  ON public.practice_call_save_queue (next_attempt_at)
  WHERE status = 'pending';

CREATE TRIGGER trg_practice_call_save_queue_updated_at
  BEFORE UPDATE ON public.practice_call_save_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();