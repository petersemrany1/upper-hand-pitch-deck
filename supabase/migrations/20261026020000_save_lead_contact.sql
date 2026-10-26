-- Contact corrections are atomic and never send a message. Historical
-- appointments and delivery records remain unchanged.
CREATE OR REPLACE FUNCTION public.save_lead_contact(
  p_lead_id uuid, p_first_name text, p_last_name text, p_phone text,
  p_expected_first_name text, p_expected_last_name text, p_expected_phone text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
<<contact_update>>
DECLARE
  contact public.meta_leads;
  appointment public.clinic_appointments;
  first_name text := btrim(p_first_name);
  last_name text := nullif(btrim(p_last_name), '');
  phone text := nullif(btrim(p_phone), '');
  digits text;
BEGIN
  IF (SELECT count(*) FROM public.booking_sales_actor()) <> 1 THEN
    RAISE EXCEPTION 'Sales access required';
  END IF;
  SELECT * INTO contact FROM public.meta_leads WHERE id=p_lead_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contact not found'; END IF;
  -- Unbooked contacts belong to the shared sales pool. Booked contacts retain
  -- the existing frozen booking-owner restriction, including older bookings.
  FOR appointment IN SELECT * FROM public.clinic_appointments WHERE lead_id=p_lead_id ORDER BY id FOR UPDATE LOOP
    IF NOT public.can_manage_booking(appointment.id) THEN
      RAISE EXCEPTION 'You can only edit contacts for your own bookings';
    END IF;
    IF appointment.outcome IS NULL AND appointment.disqualified_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM public.appointment_reminders WHERE appointment_id=appointment.id) THEN
      RAISE EXCEPTION 'The appointment reminder is not linked. Ask an administrator to repair it first';
    END IF;
  END LOOP;
  IF first_name IS NULL OR first_name='' OR length(first_name)>100 OR length(last_name)>100
    OR first_name ~ '[[:cntrl:]]' OR last_name ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION 'Enter a first name and keep each name under 100 characters';
  END IF;
  -- A name-only correction must not reset confirmation by reformatting an
  -- unchanged number. Validate/normalize only an explicitly changed number.
  IF phone IS DISTINCT FROM contact.phone THEN
    IF phone IS NULL OR phone !~ '^\+?[0-9 ()-]+$' THEN RAISE EXCEPTION 'Enter a valid phone number'; END IF;
    digits := regexp_replace(phone, '[^0-9]', '', 'g');
    phone := CASE WHEN phone LIKE '+%' THEN '+' || digits
      WHEN digits LIKE '0%' THEN '+61' || substring(digits FROM 2)
      WHEN digits LIKE '61%' THEN '+' || digits ELSE '+61' || digits END;
    IF phone !~ '^\+[1-9][0-9]{7,14}$'
      OR (phone LIKE '+61%' AND phone !~ '^\+61[23478][0-9]{8}$') THEN
      RAISE EXCEPTION 'Enter a valid phone number';
    END IF;
  END IF;
  IF (contact.first_name,contact.last_name,contact.phone)
      IS DISTINCT FROM (p_expected_first_name,p_expected_last_name,p_expected_phone)
    AND (contact.first_name,contact.last_name,contact.phone) IS DISTINCT FROM (first_name,last_name,phone) THEN
    RAISE EXCEPTION 'Contact details changed while this screen was open. Close and reopen Edit contact';
  END IF;
  UPDATE public.meta_leads SET first_name=contact_update.first_name,
    last_name=contact_update.last_name, phone=contact_update.phone, updated_at=now()
    WHERE id=p_lead_id AND (meta_leads.first_name,meta_leads.last_name,meta_leads.phone) IS DISTINCT FROM (contact_update.first_name,contact_update.last_name,contact_update.phone);
  UPDATE public.clinic_appointments SET patient_name=concat_ws(' ',first_name,last_name),
    patient_phone=phone, updated_at=now()
    WHERE lead_id=p_lead_id AND outcome IS NULL AND disqualified_at IS NULL
      AND (patient_name,patient_phone) IS DISTINCT FROM (concat_ws(' ',first_name,last_name),phone);
  -- Explicit fields also preserve multi-word first names and repair an
  -- existing mismatch even when the appointment already has the correction.
  UPDATE public.appointment_reminders r SET patient_first_name=first_name,
    patient_last_name=last_name, patient_phone=phone, updated_at=now()
    FROM public.clinic_appointments a
    WHERE r.appointment_id=a.id AND a.lead_id=p_lead_id AND a.outcome IS NULL AND a.disqualified_at IS NULL
      AND (r.patient_first_name,r.patient_last_name,r.patient_phone) IS DISTINCT FROM (first_name,last_name,phone);
  RETURN jsonb_build_object('id',p_lead_id,'first_name',first_name,'last_name',last_name,'phone',phone);
END;
$$;
REVOKE ALL ON FUNCTION public.save_lead_contact(uuid,text,text,text,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_lead_contact(uuid,text,text,text,text,text,text) TO authenticated;
