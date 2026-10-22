-- Keep the existing Confirmation calls workspace and automated reminders in sync.
CREATE OR REPLACE FUNCTION public.sync_manual_appointment_confirmation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.kind NOT IN ('confirmed','no_answer','needs_help') THEN RETURN NEW; END IF;
  IF NOT EXISTS(SELECT 1 FROM clinic_appointments a WHERE a.id=NEW.appointment_id
    AND a.updated_at=NEW.appointment_updated_at AND a.outcome IS NULL AND a.disqualified_at IS NULL) THEN RETURN NEW; END IF;
  UPDATE appointment_reminders SET
    confirmation_state=CASE WHEN NEW.kind='confirmed' THEN 'confirmed' ELSE 'needs_call' END,
    confirmation_confirmed_at=CASE WHEN NEW.kind='confirmed' THEN NEW.created_at ELSE confirmation_confirmed_at END,
    confirmation_method=CASE WHEN NEW.kind='confirmed' THEN 'phone' ELSE confirmation_method END,
    confirmation_reason=CASE WHEN NEW.kind='confirmed' THEN null ELSE 'manual_call' END,
    confirmation_call_result=NEW.kind,confirmation_last_call_at=NEW.created_at,updated_at=now()
  WHERE appointment_id=NEW.appointment_id AND status='confirmed'
    AND (confirmation_state<>'confirmed' OR NEW.kind='confirmed');
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS sync_manual_confirmation_reminders ON public.appointment_confirmation_events;
CREATE TRIGGER sync_manual_confirmation_reminders AFTER INSERT ON public.appointment_confirmation_events
  FOR EACH ROW EXECUTE FUNCTION public.sync_manual_appointment_confirmation();

-- Do not chase patients already confirmed by phone before this release.
UPDATE public.appointment_reminders r SET confirmation_state='confirmed',confirmation_method='phone',
  confirmation_confirmed_at=e.created_at,confirmation_call_result='confirmed',confirmation_last_call_at=e.created_at,
  confirmation_reason=null,updated_at=now()
FROM public.clinic_appointments a JOIN LATERAL (
  SELECT kind,created_at FROM public.appointment_confirmation_events
  WHERE appointment_id=a.id AND appointment_updated_at=a.updated_at AND kind<>'sms'
  ORDER BY created_at DESC LIMIT 1
) e ON e.kind='confirmed'
WHERE r.appointment_id=a.id AND r.status='confirmed' AND r.confirmation_state<>'confirmed'
  AND a.outcome IS NULL AND a.disqualified_at IS NULL;

REVOKE ALL ON FUNCTION public.sync_manual_appointment_confirmation() FROM PUBLIC,anon,authenticated;
