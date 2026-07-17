ALTER TABLE public.meta_leads ADD COLUMN IF NOT EXISTS lead_id text;
CREATE UNIQUE INDEX IF NOT EXISTS meta_leads_lead_id_unique ON public.meta_leads (lead_id) WHERE lead_id IS NOT NULL;
DELETE FROM public.meta_leads WHERE id = 'b89e79f0-9505-41a0-9118-fe95b46747a8';