ALTER TABLE public.call_records
  ADD COLUMN IF NOT EXISTS direction text NOT NULL DEFAULT 'outbound';

CREATE INDEX IF NOT EXISTS call_records_direction_called_at_idx
  ON public.call_records (direction, called_at DESC);