
ALTER TABLE public.call_records
  ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES public.clinics(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS needs_review boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_call_records_clinic_id ON public.call_records (clinic_id);
CREATE INDEX IF NOT EXISTS idx_call_records_needs_review ON public.call_records (needs_review) WHERE needs_review = true;
