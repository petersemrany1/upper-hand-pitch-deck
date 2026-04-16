
CREATE TABLE public.contract_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  clinic_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  package_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent'
);

ALTER TABLE public.contract_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view contract logs" ON public.contract_logs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert contract logs" ON public.contract_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update contract logs" ON public.contract_logs FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete contract logs" ON public.contract_logs FOR DELETE USING (true);
