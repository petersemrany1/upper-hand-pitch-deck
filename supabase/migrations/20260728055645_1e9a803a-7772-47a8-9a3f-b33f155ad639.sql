
ALTER TABLE public.clinicflow_clinic_settings
  ALTER COLUMN default_deposit_amount SET DEFAULT 1000,
  ALTER COLUMN quote_validity_days   SET DEFAULT 14;

UPDATE public.clinicflow_clinic_settings
  SET default_deposit_amount = 1000,
      quote_validity_days   = 14
WHERE clinic_id = '23f9d66b-922c-4610-bfd5-486774ee06c4';
