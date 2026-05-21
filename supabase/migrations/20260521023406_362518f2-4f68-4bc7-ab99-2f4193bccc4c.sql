ALTER TABLE public.clinic_appointments
  ADD CONSTRAINT clinic_appointments_date_sane
  CHECK (appointment_date >= DATE '2024-01-01' AND appointment_date <= DATE '2100-01-01');