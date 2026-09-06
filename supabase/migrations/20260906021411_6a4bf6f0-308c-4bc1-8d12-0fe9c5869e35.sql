CREATE INDEX IF NOT EXISTS ad_spend_daily_date_idx ON public.ad_spend_daily (date);
CREATE INDEX IF NOT EXISTS ad_spend_daily_ad_name_idx ON public.ad_spend_daily (ad_name);
CREATE INDEX IF NOT EXISTS meta_leads_ad_name_idx ON public.meta_leads (ad_name);
CREATE INDEX IF NOT EXISTS meta_leads_created_at_idx ON public.meta_leads (created_at);
CREATE INDEX IF NOT EXISTS clinic_appointments_lead_id_idx ON public.clinic_appointments (lead_id);