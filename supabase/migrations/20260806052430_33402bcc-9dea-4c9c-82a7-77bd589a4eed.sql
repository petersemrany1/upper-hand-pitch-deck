DO $$
DECLARE c uuid := '23f9d66b-922c-4610-bfd5-486774ee06c4';
BEGIN
  DELETE FROM public.clinicflow_followups WHERE clinic_id = c;
  DELETE FROM public.clinicflow_chase_requests WHERE clinic_id = c;
  DELETE FROM public.clinicflow_quotes WHERE clinic_id = c;
  DELETE FROM public.clinicflow_pipeline_status WHERE clinic_id = c;
  DELETE FROM public.clinicflow_intakes WHERE clinic_id = c;
  DELETE FROM public.clinicflow_photos WHERE clinic_id = c;
  DELETE FROM public.clinicflow_clinic_settings WHERE clinic_id = c;
  DELETE FROM public.clinic_appointment_notes WHERE clinic_id = c;
  DELETE FROM public.appointment_reminders WHERE lead_id IN (
    SELECT lead_id FROM public.clinic_appointments WHERE clinic_id = c AND lead_id IS NOT NULL
  );
  DELETE FROM public.clinic_appointments WHERE clinic_id = c;
  DELETE FROM public.clinic_trading_hours WHERE clinic_id = c;
  DELETE FROM public.clinic_availability WHERE clinic_id = c;
  DELETE FROM public.clinic_blocked_slots WHERE clinic_id = c;
  DELETE FROM public.clinic_packs WHERE clinic_id = c;
  DELETE FROM public.partner_doctors WHERE clinic_id = c;
  DELETE FROM public.clinic_portal_users WHERE clinic_id = c;
  DELETE FROM public.partner_clinics WHERE id = c;
END $$;