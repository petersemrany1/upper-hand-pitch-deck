ALTER TABLE public.clinicflow_quotes ADD COLUMN description TEXT;
GRANT SELECT, INSERT, UPDATE ON public.clinicflow_quotes TO authenticated;
GRANT ALL ON public.clinicflow_quotes TO service_role;