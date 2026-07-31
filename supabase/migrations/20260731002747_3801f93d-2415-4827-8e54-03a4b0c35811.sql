ALTER TABLE public.clinic_appointments
  ADD CONSTRAINT clinic_appointments_lead_id_fkey
  FOREIGN KEY (lead_id) REFERENCES public.meta_leads(id) ON DELETE SET NULL;