CREATE TABLE public.appointment_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID,
  booking_date DATE,
  booking_time TIME,
  doctor_name TEXT,
  patient_first_name TEXT,
  patient_phone TEXT,
  three_day_sms_sent BOOLEAN NOT NULL DEFAULT false,
  three_day_sms_sent_at TIMESTAMPTZ,
  twentyfour_hour_sms_sent BOOLEAN NOT NULL DEFAULT false,
  twentyfour_hour_sms_sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_appointment_reminders_lead_id ON public.appointment_reminders(lead_id);
CREATE INDEX idx_appointment_reminders_booking_date ON public.appointment_reminders(booking_date);
CREATE INDEX idx_appointment_reminders_status ON public.appointment_reminders(status);

ALTER TABLE public.appointment_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read appointment_reminders"
  ON public.appointment_reminders FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated insert appointment_reminders"
  ON public.appointment_reminders FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated update appointment_reminders"
  ON public.appointment_reminders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated delete appointment_reminders"
  ON public.appointment_reminders FOR DELETE TO authenticated USING (true);

CREATE TRIGGER appointment_reminders_updated_at
  BEFORE UPDATE ON public.appointment_reminders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();