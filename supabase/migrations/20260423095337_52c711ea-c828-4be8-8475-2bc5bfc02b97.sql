
CREATE TABLE public.stripe_links (
  package_id text PRIMARY KEY,
  url text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read stripe_links"
  ON public.stripe_links FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated insert stripe_links"
  ON public.stripe_links FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated update stripe_links"
  ON public.stripe_links FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER stripe_links_updated_at
  BEFORE UPDATE ON public.stripe_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.stripe_links (package_id, url) VALUES
  ('demo', 'https://buy.stripe.com/4gM6oJ7fO1kH2jXc5qffy00'),
  ('starter', 'https://buy.stripe.com/8x2bJ39nW8N9f6JfhCffy01'),
  ('scale', 'https://buy.stripe.com/fZu8wRdEc4wT0bPfhCffy02'),
  ('custom', '');
