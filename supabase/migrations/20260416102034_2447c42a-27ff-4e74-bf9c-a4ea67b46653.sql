
-- Add time field to clinic_contacts for scheduling
ALTER TABLE public.clinic_contacts ADD COLUMN IF NOT EXISTS next_action_time text;

-- Add reminder tracking to clinics
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS reminder_sent boolean NOT NULL DEFAULT false;

-- Change default status
ALTER TABLE public.clinics ALTER COLUMN status SET DEFAULT 'Not Started';
