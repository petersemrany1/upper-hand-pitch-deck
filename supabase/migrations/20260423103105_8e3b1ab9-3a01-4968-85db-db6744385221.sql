CREATE TABLE public.sent_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'payment_link',
  clinic_name text NOT NULL,
  contact_name text NOT NULL,
  email text,
  phone text,
  package_name text NOT NULL,
  shows integer NOT NULL DEFAULT 0,
  per_show_fee numeric NOT NULL DEFAULT 0,
  total_exc_gst numeric NOT NULL DEFAULT 0,
  gst numeric NOT NULL DEFAULT 0,
  total_inc_gst numeric NOT NULL DEFAULT 0,
  stripe_url text,
  send_method text NOT NULL DEFAULT 'email',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sent_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read sent_links"
  ON public.sent_links FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated insert sent_links"
  ON public.sent_links FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated update sent_links"
  ON public.sent_links FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_sent_links_updated_at
  BEFORE UPDATE ON public.sent_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_sent_links_created_at ON public.sent_links (created_at DESC);