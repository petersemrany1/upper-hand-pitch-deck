-- Legal move, switch-over step: run in the Hair database ON MOVE DAY ONLY,
-- after boldfamilylaw.com.au points at this app and LEGAL_LIVE=true.
-- Turns on Legal's database automations, live updates and timed jobs.
-- The timed jobs ring Legal's doorbells on boldfamilylaw.com.au with the
-- cron token stored in legal_app_settings (copied from the Legal app).

-- 1. Database automations (created switched off in the legal_ schema parts).
ALTER TABLE public.legal_app_settings ENABLE TRIGGER "set_app_settings_updated_at";
ALTER TABLE public.legal_appointment_reminders ENABLE TRIGGER "legal_bridge_appointment_reminder";
ALTER TABLE public.legal_appointment_reminders ENABLE TRIGGER "set_appointment_reminders_updated_at";
ALTER TABLE public.legal_call_records ENABLE TRIGGER "set_call_records_updated_at";
ALTER TABLE public.legal_client_asset_calculations ENABLE TRIGGER "legal_stamp_client_asset_calculation";
ALTER TABLE public.legal_client_leads ENABLE TRIGGER "set_client_leads_updated_at";
ALTER TABLE public.legal_deck_settings ENABLE TRIGGER "deck_settings_set_updated_at";
ALTER TABLE public.legal_error_logs ENABLE TRIGGER "set_error_logs_updated_at";
ALTER TABLE public.legal_firm_application_messages ENABLE TRIGGER "stop_sequence_on_firm_message";
ALTER TABLE public.legal_firm_applications ENABLE TRIGGER "firm_applications_set_updated_at";
ALTER TABLE public.legal_firm_applications ENABLE TRIGGER "stop_booking_follow_ups_on_stage";
ALTER TABLE public.legal_firm_appointments ENABLE TRIGGER "booking_slot_guard";
ALTER TABLE public.legal_firm_appointments ENABLE TRIGGER "legal_capture_appointment_office";
ALTER TABLE public.legal_firm_appointments ENABLE TRIGGER "legal_capture_legal_booking_owner";
ALTER TABLE public.legal_firm_appointments ENABLE TRIGGER "legal_enforce_admin_only_disqualification";
ALTER TABLE public.legal_firm_appointments ENABLE TRIGGER "legal_enforce_firm_appointment_update_limits";
ALTER TABLE public.legal_firm_appointments ENABLE TRIGGER "legal_firm_offer_show_milestone";
ALTER TABLE public.legal_firm_appointments ENABLE TRIGGER "legal_gate_firm_offer_booking";
ALTER TABLE public.legal_firm_appointments ENABLE TRIGGER "legal_calendar_history";
ALTER TABLE public.legal_firm_appointments ENABLE TRIGGER "set_firm_appointments_updated_at";
ALTER TABLE public.legal_firm_appointments ENABLE TRIGGER "legal_track_appointment_reminder_version";
ALTER TABLE public.legal_firm_availability ENABLE TRIGGER "legal_calendar_history";
ALTER TABLE public.legal_firm_availability ENABLE TRIGGER "legal_schedule_lock";
ALTER TABLE public.legal_firm_availability ENABLE TRIGGER "protect_booked_overrides";
ALTER TABLE public.legal_firm_availability ENABLE TRIGGER "set_firm_availability_updated_at";
ALTER TABLE public.legal_firm_blocked_slots ENABLE TRIGGER "legal_calendar_history";
ALTER TABLE public.legal_firm_blocked_slots ENABLE TRIGGER "legal_schedule_lock";
ALTER TABLE public.legal_firm_blocked_slots ENABLE TRIGGER "protect_booked_blocks";
ALTER TABLE public.legal_firm_blocked_slots ENABLE TRIGGER "set_firm_blocked_slots_updated_at";
ALTER TABLE public.legal_firm_contracts ENABLE TRIGGER "trg_firm_contracts_updated_at";
ALTER TABLE public.legal_firm_lawyers ENABLE TRIGGER "set_firm_lawyers_updated_at";
ALTER TABLE public.legal_firm_locations ENABLE TRIGGER "set_firm_locations_updated_at";
ALTER TABLE public.legal_firm_offers ENABLE TRIGGER "legal_freeze_firm_offer_payment_identity";
ALTER TABLE public.legal_firm_offers ENABLE TRIGGER "legal_guard_firm_offer_invitation";
ALTER TABLE public.legal_firm_packs ENABLE TRIGGER "legal_freeze_firm_offer_pack_terms";
ALTER TABLE public.legal_firm_packs ENABLE TRIGGER "set_firm_packs_updated_at";
ALTER TABLE public.legal_firm_profile_items ENABLE TRIGGER "set_firm_profile_items_updated_at";
ALTER TABLE public.legal_firm_profile_sections ENABLE TRIGGER "set_firm_profile_sections_updated_at";
ALTER TABLE public.legal_firm_trading_hours ENABLE TRIGGER "legal_calendar_history";
ALTER TABLE public.legal_firm_trading_hours ENABLE TRIGGER "legal_schedule_lock";
ALTER TABLE public.legal_firm_trading_hours ENABLE TRIGGER "protect_booked_hours";
ALTER TABLE public.legal_firm_trading_hours ENABLE TRIGGER "set_firm_trading_hours_updated_at";
ALTER TABLE public.legal_firms ENABLE TRIGGER "legal_init_firm_office";
ALTER TABLE public.legal_firms ENABLE TRIGGER "legal_init_firm_reminder_settings";
ALTER TABLE public.legal_firms ENABLE TRIGGER "legal_calendar_history";
ALTER TABLE public.legal_firms ENABLE TRIGGER "legal_schedule_lock";
ALTER TABLE public.legal_firms ENABLE TRIGGER "set_firms_updated_at";
ALTER TABLE public.legal_phone_numbers ENABLE TRIGGER "set_phone_numbers_updated_at";
ALTER TABLE public.legal_profiles ENABLE TRIGGER "profiles_set_updated_at";
ALTER TABLE public.legal_prospect_call_attempts ENABLE TRIGGER "prospect_call_attempts_guard";
ALTER TABLE public.legal_prospect_call_attempts ENABLE TRIGGER "set_prospect_call_attempts_updated_at";
ALTER TABLE public.legal_prospect_contacts ENABLE TRIGGER "set_prospect_contacts_updated_at";
ALTER TABLE public.legal_prospect_firms ENABLE TRIGGER "prospect_firms_dnc";
ALTER TABLE public.legal_prospect_firms ENABLE TRIGGER "set_prospect_firms_updated_at";
ALTER TABLE public.legal_rep_module_progress ENABLE TRIGGER "rep_module_progress_set_updated_at";
ALTER TABLE public.legal_rep_sessions ENABLE TRIGGER "legal_release_sales_session_claim";
ALTER TABLE public.legal_rep_sessions ENABLE TRIGGER "set_rep_sessions_updated_at";
ALTER TABLE public.legal_sales_reps ENABLE TRIGGER "set_sales_reps_updated_at";
ALTER TABLE public.legal_sms_messages ENABLE TRIGGER "legal_mirror_firm_sms";
ALTER TABLE public.legal_sms_messages ENABLE TRIGGER "set_sms_messages_updated_at";
ALTER TABLE public.legal_sms_messages ENABLE TRIGGER "stop_booking_follow_ups_on_reply";
ALTER TABLE public.legal_sms_threads ENABLE TRIGGER "set_sms_threads_updated_at";

-- 2. Live updates the Legal screens listen for.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['legal_client_leads','legal_firms','legal_firm_appointments','legal_firm_trading_hours','legal_firm_blocked_slots','legal_firm_availability'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

-- 3. Timed jobs (the Legal app's legal-meta-spend-daily job was switched off, so it isn't recreated).
SELECT cron.schedule('legal-firm-booking-follow-ups', '* * * * *', $job$
  SELECT net.http_post(
    url := 'https://boldfamilylaw.com.au/api/public/hooks/send-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-internal-secret', (SELECT value->>'token' FROM public.legal_app_settings WHERE key = 'cron_token'),
      'x-booking-follow-ups-only', 'true'),
    body := '{}'::jsonb);
$job$);
SELECT cron.schedule('legal-qualified-client-call-hooks', '* * * * *', $job$
  SELECT net.http_post(
    url := 'https://boldfamilylaw.com.au/api/public/hooks/process-call-hooks',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-internal-secret', (SELECT value->>'token' FROM public.legal_app_settings WHERE key = 'cron_token')),
    body := '{}'::jsonb, timeout_milliseconds := 120000);
$job$);
SELECT cron.schedule('legal-send-appointment-reminders', '*/15 * * * *', $job$
  SELECT net.http_post(
    url := 'https://boldfamilylaw.com.au/api/public/hooks/send-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-internal-secret', (SELECT value->>'token' FROM public.legal_app_settings WHERE key = 'cron_token')),
    body := '{}'::jsonb);
$job$);
