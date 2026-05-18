
CREATE TABLE public.rep_booking_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_id uuid NOT NULL,
  year integer NOT NULL,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  target integer NOT NULL DEFAULT 0 CHECK (target >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rep_id, year, month)
);

ALTER TABLE public.rep_booking_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all rep_booking_targets"
  ON public.rep_booking_targets FOR ALL
  TO authenticated
  USING (has_sales_role(ARRAY['admin'::text]))
  WITH CHECK (has_sales_role(ARRAY['admin'::text]));

CREATE POLICY "Reps read all rep_booking_targets"
  ON public.rep_booking_targets FOR SELECT
  TO authenticated
  USING (has_sales_role(ARRAY['admin'::text, 'rep'::text]));

CREATE TRIGGER update_rep_booking_targets_updated_at
  BEFORE UPDATE ON public.rep_booking_targets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
