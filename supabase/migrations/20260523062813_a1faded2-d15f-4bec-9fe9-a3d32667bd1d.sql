-- When a clinic appointment is rescheduled, sync the matching appointment_reminders row
-- (sales appointments tab reads from here) and reset SMS-sent flags so new reminders fire.

CREATE OR REPLACE FUNCTION public.sync_reminder_on_reschedule()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_time time;
BEGIN
  -- Only act when date or time actually changed
  IF NEW.appointment_date IS DISTINCT FROM OLD.appointment_date
     OR NEW.appointment_time IS DISTINCT FROM OLD.appointment_time THEN

    BEGIN
      v_time := NEW.appointment_time::time;
    EXCEPTION WHEN others THEN
      v_time := NULL;
    END;

    IF NEW.lead_id IS NOT NULL THEN
      UPDATE public.appointment_reminders
      SET booking_date = NEW.appointment_date,
          booking_time = v_time,
          three_day_sms_sent = false,
          three_day_sms_sent_at = NULL,
          twentyfour_hour_sms_sent = false,
          twentyfour_hour_sms_sent_at = NULL,
          updated_at = now()
      WHERE lead_id = NEW.lead_id
        AND booking_date = OLD.appointment_date;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clinic_appointments_sync_reminder ON public.clinic_appointments;
CREATE TRIGGER clinic_appointments_sync_reminder
AFTER UPDATE ON public.clinic_appointments
FOR EACH ROW
EXECUTE FUNCTION public.sync_reminder_on_reschedule();