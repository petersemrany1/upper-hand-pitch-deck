
CREATE TABLE public.phone_numbers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  number text NOT NULL UNIQUE,
  friendly_name text,
  status text NOT NULL DEFAULT 'active',
  last_used_at timestamptz,
  call_count integer NOT NULL DEFAULT 0,
  twilio_sid text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.phone_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read phone_numbers" ON public.phone_numbers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert phone_numbers" ON public.phone_numbers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update phone_numbers" ON public.phone_numbers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete phone_numbers" ON public.phone_numbers FOR DELETE TO authenticated USING (true);

CREATE INDEX phone_numbers_status_last_used_idx ON public.phone_numbers (status, last_used_at NULLS FIRST);

ALTER TABLE public.call_records ADD COLUMN IF NOT EXISTS from_number text;
