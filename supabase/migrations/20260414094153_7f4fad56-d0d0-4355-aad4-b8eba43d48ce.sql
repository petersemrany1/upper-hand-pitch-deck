
-- Create clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create call_records table
CREATE TABLE public.call_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  twilio_call_sid TEXT,
  status TEXT DEFAULT 'initiated',
  duration INTEGER,
  recording_url TEXT,
  recording_sid TEXT,
  called_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_records ENABLE ROW LEVEL SECURITY;

-- Open access policies (no auth in this app)
CREATE POLICY "Anyone can view clients" ON public.clients FOR SELECT USING (true);
CREATE POLICY "Anyone can insert clients" ON public.clients FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update clients" ON public.clients FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete clients" ON public.clients FOR DELETE USING (true);

CREATE POLICY "Anyone can view call records" ON public.call_records FOR SELECT USING (true);
CREATE POLICY "Anyone can insert call records" ON public.call_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update call records" ON public.call_records FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete call records" ON public.call_records FOR DELETE USING (true);

-- Indexes
CREATE INDEX idx_call_records_client_id ON public.call_records(client_id);

-- Update timestamp function (if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_call_records_updated_at BEFORE UPDATE ON public.call_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
