CREATE TABLE public.clinic_packs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.partner_clinics(id) ON DELETE CASCADE,
  pack_size INTEGER NOT NULL CHECK (pack_size > 0),
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_clinic_packs_clinic_id ON public.clinic_packs(clinic_id);
CREATE INDEX idx_clinic_packs_clinic_purchased ON public.clinic_packs(clinic_id, purchased_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_packs TO authenticated;
GRANT ALL ON public.clinic_packs TO service_role;

ALTER TABLE public.clinic_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all clinic packs"
  ON public.clinic_packs FOR ALL
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

CREATE POLICY "Clinic users can view their own packs"
  ON public.clinic_packs FOR SELECT
  USING (public.is_clinic_user_for(clinic_id));

CREATE TRIGGER update_clinic_packs_updated_at
  BEFORE UPDATE ON public.clinic_packs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();