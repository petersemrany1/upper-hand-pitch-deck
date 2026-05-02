-- Per-clinic booking price
ALTER TABLE public.partner_clinics
  ADD COLUMN IF NOT EXISTS price_per_booking numeric NOT NULL DEFAULT 800;

-- App-wide settings (key/value)
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read app_settings"
  ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert app_settings"
  ON public.app_settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update app_settings"
  ON public.app_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.app_settings (key, value)
VALUES ('default_booking_price', '800'::jsonb)
ON CONFLICT (key) DO NOTHING;