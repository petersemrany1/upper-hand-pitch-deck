-- Meta Ads leads table
CREATE TABLE public.meta_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  funding_preference TEXT,
  ad_name TEXT,
  ad_set_name TEXT,
  campaign_name TEXT,
  creative_time TIMESTAMP WITH TIME ZONE,
  raw_payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.meta_leads ENABLE ROW LEVEL SECURITY;

-- Authenticated dashboard users can manage leads
CREATE POLICY "Authenticated read meta_leads"
ON public.meta_leads FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated update meta_leads"
ON public.meta_leads FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated delete meta_leads"
ON public.meta_leads FOR DELETE TO authenticated USING (true);

-- No public/anon insert policy: inserts go through the server route
-- which uses the service role key (bypasses RLS) after verifying the bearer token.

CREATE TRIGGER update_meta_leads_updated_at
BEFORE UPDATE ON public.meta_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_meta_leads_created_at ON public.meta_leads(created_at DESC);
CREATE INDEX idx_meta_leads_email ON public.meta_leads(email);