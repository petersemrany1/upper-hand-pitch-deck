ALTER TABLE public.phone_numbers ADD COLUMN IF NOT EXISTS mms_enabled boolean NOT NULL DEFAULT false;
UPDATE public.phone_numbers SET mms_enabled = true WHERE number IN ('+61468031075','+61483938205');
UPDATE public.phone_numbers SET mms_enabled = false WHERE number NOT IN ('+61468031075','+61483938205');