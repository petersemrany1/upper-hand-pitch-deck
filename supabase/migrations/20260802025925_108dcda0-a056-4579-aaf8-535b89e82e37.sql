ALTER TABLE public.clinicflow_quotes ADD COLUMN IF NOT EXISTS graft_unit text NOT NULL DEFAULT 'grafts';
ALTER TABLE public.clinicflow_quotes ADD CONSTRAINT clinicflow_quotes_graft_unit_check CHECK (graft_unit IN ('grafts','hairs'));
UPDATE public.clinicflow_clinic_settings SET logo_url = NULL WHERE clinic_id = '23f9d66b-922c-4610-bfd5-486774ee06c4';