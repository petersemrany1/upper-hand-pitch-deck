-- Partner clinics (approved clinics we send patients to)
CREATE TABLE IF NOT EXISTS public.partner_clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_name text NOT NULL,
  address text,
  city text,
  state text,
  phone text,
  email text,
  website text,
  is_active boolean NOT NULL DEFAULT true,
  consult_price_original numeric DEFAULT 395,
  consult_price_deposit numeric DEFAULT 75,
  parking_info text,
  nearby_landmarks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Doctors at partner clinics
CREATE TABLE IF NOT EXISTS public.partner_doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES public.partner_clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  title text,
  years_experience integer,
  specialties text,
  credentials text,
  training_background text,
  what_makes_them_different text,
  natural_results_approach text,
  advanced_cases text,
  talking_points text,
  aftercare_included text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_doctors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read partner_clinics" ON public.partner_clinics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert partner_clinics" ON public.partner_clinics FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update partner_clinics" ON public.partner_clinics FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete partner_clinics" ON public.partner_clinics FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated read partner_doctors" ON public.partner_doctors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert partner_doctors" ON public.partner_doctors FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update partner_doctors" ON public.partner_doctors FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete partner_doctors" ON public.partner_doctors FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_partner_clinics_updated_at BEFORE UPDATE ON public.partner_clinics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_partner_doctors_updated_at BEFORE UPDATE ON public.partner_doctors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_partner_doctors_clinic_id ON public.partner_doctors(clinic_id);

-- Seed Nitai
INSERT INTO public.partner_clinics (clinic_name, address, city, state, consult_price_original, consult_price_deposit, parking_info, nearby_landmarks)
VALUES (
  'Nitai Medical & Cosmetic Centre',
  '64 Lincoln Rd',
  'Essendon',
  'VIC',
  395,
  75,
  'Free parking on site',
  'Near Lincoln Park · 5 mins DFO · 10 mins Melbourne Airport · off Tullamarine Freeway'
);

INSERT INTO public.partner_doctors (clinic_id, name, title, years_experience, specialties, credentials, training_background, what_makes_them_different, natural_results_approach, advanced_cases, talking_points, aftercare_included)
SELECT
  id,
  'Dr. Shabna Singh',
  'Hair Transplant Specialist',
  6,
  'Hair transplants, cosmetic injectables',
  'Derma Sutic global ambassador, world-class cosmetic injectable trainer',
  'Six years performing hair transplants, trains practitioners globally',
  'Dr. Singh places every graft at the exact angle your natural hair grows — studying the direction, flow and full pattern. This is what separates a result that looks fake from one nobody can ever tell.',
  'Never plants grafts straight up like most clinics. Every graft is angled to match natural hair growth so the result is completely undetectable.',
  'Treats advanced cases and afro hair that most clinics turn away. No one turned away — even fully bald patients can be treated with body hair, PRP and stem cell.',
  'She is in the room all day — not just for design. Full aftercare included.',
  'Full aftercare included — PRP, stem cell therapy, medication. Follow up at 2 weeks then monthly.'
FROM public.partner_clinics WHERE clinic_name = 'Nitai Medical & Cosmetic Centre';