ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS parent_clinic_id uuid NULL REFERENCES public.clinics(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_parent boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS clinics_parent_clinic_id_idx ON public.clinics(parent_clinic_id);