
ALTER TABLE public.meta_leads DISABLE TRIGGER update_meta_leads_updated_at;
UPDATE public.meta_leads SET updated_at = '2026-04-28 04:00:00+00' WHERE id = '2de5ccf6-3e62-4440-8322-fb2a0a276df7';
ALTER TABLE public.meta_leads ENABLE TRIGGER update_meta_leads_updated_at;
