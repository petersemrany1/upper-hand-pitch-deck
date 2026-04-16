
-- Clinics table
CREATE TABLE public.clinics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_name TEXT NOT NULL,
  state TEXT,
  city TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  owner_name TEXT,
  priority TEXT NOT NULL DEFAULT 'Medium',
  status TEXT NOT NULL DEFAULT 'New',
  next_follow_up DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view clinics" ON public.clinics FOR SELECT USING (true);
CREATE POLICY "Anyone can insert clinics" ON public.clinics FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update clinics" ON public.clinics FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete clinics" ON public.clinics FOR DELETE USING (true);

CREATE TRIGGER update_clinics_updated_at
  BEFORE UPDATE ON public.clinics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Clinic contacts (activity log) table
CREATE TABLE public.clinic_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  contact_type TEXT NOT NULL,
  outcome TEXT,
  notes TEXT,
  next_action TEXT,
  next_action_date DATE,
  duration TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.clinic_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view clinic contacts" ON public.clinic_contacts FOR SELECT USING (true);
CREATE POLICY "Anyone can insert clinic contacts" ON public.clinic_contacts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update clinic contacts" ON public.clinic_contacts FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete clinic contacts" ON public.clinic_contacts FOR DELETE USING (true);
