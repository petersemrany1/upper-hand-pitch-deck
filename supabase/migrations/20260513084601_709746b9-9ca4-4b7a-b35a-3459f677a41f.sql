-- Role helpers based on the signed-in user's email, because sales_reps rows are matched by email in the app.
CREATE OR REPLACE FUNCTION public.current_sales_rep_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sr.role
  FROM public.sales_reps sr
  WHERE lower(sr.email) = lower(auth.jwt() ->> 'email')
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.has_sales_role(_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(public.current_sales_rep_role() = ANY(_roles), false)
$$;

CREATE OR REPLACE FUNCTION public.is_clinic_setter_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(public.current_sales_rep_role() = ANY(ARRAY['caller', 'clinic_setter']), false)
$$;

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sales_reps sr
    WHERE (sr.id = auth.uid() OR lower(sr.email) = lower(auth.jwt() ->> 'email'))
      AND sr.role = 'admin'
  )
$$;

-- Sales-module tables: admins and sales reps only, never clinic setters.
DROP POLICY IF EXISTS "Authenticated read meta_leads" ON public.meta_leads;
DROP POLICY IF EXISTS "Authenticated update meta_leads" ON public.meta_leads;
DROP POLICY IF EXISTS "Authenticated delete meta_leads" ON public.meta_leads;
CREATE POLICY "Admins and sales reps read meta_leads" ON public.meta_leads FOR SELECT TO authenticated USING (public.has_sales_role(ARRAY['admin','rep']));
CREATE POLICY "Admins and sales reps update meta_leads" ON public.meta_leads FOR UPDATE TO authenticated USING (public.has_sales_role(ARRAY['admin','rep'])) WITH CHECK (public.has_sales_role(ARRAY['admin','rep']));
CREATE POLICY "Admins and sales reps delete meta_leads" ON public.meta_leads FOR DELETE TO authenticated USING (public.has_sales_role(ARRAY['admin','rep']));

DROP POLICY IF EXISTS "Authenticated read clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated insert clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated update clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated delete clients" ON public.clients;
CREATE POLICY "Admins and sales reps read clients" ON public.clients FOR SELECT TO authenticated USING (public.has_sales_role(ARRAY['admin','rep']));
CREATE POLICY "Admins and sales reps insert clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (public.has_sales_role(ARRAY['admin','rep']));
CREATE POLICY "Admins and sales reps update clients" ON public.clients FOR UPDATE TO authenticated USING (public.has_sales_role(ARRAY['admin','rep'])) WITH CHECK (public.has_sales_role(ARRAY['admin','rep']));
CREATE POLICY "Admins and sales reps delete clients" ON public.clients FOR DELETE TO authenticated USING (public.has_sales_role(ARRAY['admin','rep']));

DROP POLICY IF EXISTS "Authenticated read partner_clinics" ON public.partner_clinics;
DROP POLICY IF EXISTS "Authenticated insert partner_clinics" ON public.partner_clinics;
DROP POLICY IF EXISTS "Authenticated update partner_clinics" ON public.partner_clinics;
DROP POLICY IF EXISTS "Authenticated delete partner_clinics" ON public.partner_clinics;
CREATE POLICY "Admins and sales reps read partner_clinics" ON public.partner_clinics FOR SELECT TO authenticated USING (public.has_sales_role(ARRAY['admin','rep']));
CREATE POLICY "Admins and sales reps insert partner_clinics" ON public.partner_clinics FOR INSERT TO authenticated WITH CHECK (public.has_sales_role(ARRAY['admin','rep']));
CREATE POLICY "Admins and sales reps update partner_clinics" ON public.partner_clinics FOR UPDATE TO authenticated USING (public.has_sales_role(ARRAY['admin','rep'])) WITH CHECK (public.has_sales_role(ARRAY['admin','rep']));
CREATE POLICY "Admins and sales reps delete partner_clinics" ON public.partner_clinics FOR DELETE TO authenticated USING (public.has_sales_role(ARRAY['admin','rep']));

DROP POLICY IF EXISTS "Authenticated read partner_doctors" ON public.partner_doctors;
DROP POLICY IF EXISTS "Authenticated insert partner_doctors" ON public.partner_doctors;
DROP POLICY IF EXISTS "Authenticated update partner_doctors" ON public.partner_doctors;
DROP POLICY IF EXISTS "Authenticated delete partner_doctors" ON public.partner_doctors;
CREATE POLICY "Admins and sales reps read partner_doctors" ON public.partner_doctors FOR SELECT TO authenticated USING (public.has_sales_role(ARRAY['admin','rep']));
CREATE POLICY "Admins and sales reps insert partner_doctors" ON public.partner_doctors FOR INSERT TO authenticated WITH CHECK (public.has_sales_role(ARRAY['admin','rep']));
CREATE POLICY "Admins and sales reps update partner_doctors" ON public.partner_doctors FOR UPDATE TO authenticated USING (public.has_sales_role(ARRAY['admin','rep'])) WITH CHECK (public.has_sales_role(ARRAY['admin','rep']));
CREATE POLICY "Admins and sales reps delete partner_doctors" ON public.partner_doctors FOR DELETE TO authenticated USING (public.has_sales_role(ARRAY['admin','rep']));

DROP POLICY IF EXISTS "Authenticated read appointment_reminders" ON public.appointment_reminders;
DROP POLICY IF EXISTS "Authenticated insert appointment_reminders" ON public.appointment_reminders;
DROP POLICY IF EXISTS "Authenticated update appointment_reminders" ON public.appointment_reminders;
DROP POLICY IF EXISTS "Authenticated delete appointment_reminders" ON public.appointment_reminders;
CREATE POLICY "Admins and sales reps read appointment_reminders" ON public.appointment_reminders FOR SELECT TO authenticated USING (public.has_sales_role(ARRAY['admin','rep']));
CREATE POLICY "Admins and sales reps insert appointment_reminders" ON public.appointment_reminders FOR INSERT TO authenticated WITH CHECK (public.has_sales_role(ARRAY['admin','rep']));
CREATE POLICY "Admins and sales reps update appointment_reminders" ON public.appointment_reminders FOR UPDATE TO authenticated USING (public.has_sales_role(ARRAY['admin','rep'])) WITH CHECK (public.has_sales_role(ARRAY['admin','rep']));
CREATE POLICY "Admins and sales reps delete appointment_reminders" ON public.appointment_reminders FOR DELETE TO authenticated USING (public.has_sales_role(ARRAY['admin','rep']));

-- Admin/config tables: admins only.
DROP POLICY IF EXISTS "Authenticated read app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Authenticated insert app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Authenticated update app_settings" ON public.app_settings;
CREATE POLICY "Admins read app_settings" ON public.app_settings FOR SELECT TO authenticated USING (public.has_sales_role(ARRAY['admin']));
CREATE POLICY "Admins insert app_settings" ON public.app_settings FOR INSERT TO authenticated WITH CHECK (public.has_sales_role(ARRAY['admin']));
CREATE POLICY "Admins update app_settings" ON public.app_settings FOR UPDATE TO authenticated USING (public.has_sales_role(ARRAY['admin'])) WITH CHECK (public.has_sales_role(ARRAY['admin']));

DROP POLICY IF EXISTS "Authenticated read stripe_links" ON public.stripe_links;
DROP POLICY IF EXISTS "Authenticated insert stripe_links" ON public.stripe_links;
DROP POLICY IF EXISTS "Authenticated update stripe_links" ON public.stripe_links;
CREATE POLICY "Admins read stripe_links" ON public.stripe_links FOR SELECT TO authenticated USING (public.has_sales_role(ARRAY['admin']));
CREATE POLICY "Admins insert stripe_links" ON public.stripe_links FOR INSERT TO authenticated WITH CHECK (public.has_sales_role(ARRAY['admin']));
CREATE POLICY "Admins update stripe_links" ON public.stripe_links FOR UPDATE TO authenticated USING (public.has_sales_role(ARRAY['admin'])) WITH CHECK (public.has_sales_role(ARRAY['admin']));

DROP POLICY IF EXISTS "Authenticated read phone_numbers" ON public.phone_numbers;
DROP POLICY IF EXISTS "Authenticated insert phone_numbers" ON public.phone_numbers;
DROP POLICY IF EXISTS "Authenticated update phone_numbers" ON public.phone_numbers;
DROP POLICY IF EXISTS "Authenticated delete phone_numbers" ON public.phone_numbers;
CREATE POLICY "Admins read phone_numbers" ON public.phone_numbers FOR SELECT TO authenticated USING (public.has_sales_role(ARRAY['admin']));
CREATE POLICY "Admins insert phone_numbers" ON public.phone_numbers FOR INSERT TO authenticated WITH CHECK (public.has_sales_role(ARRAY['admin']));
CREATE POLICY "Admins update phone_numbers" ON public.phone_numbers FOR UPDATE TO authenticated USING (public.has_sales_role(ARRAY['admin'])) WITH CHECK (public.has_sales_role(ARRAY['admin']));
CREATE POLICY "Admins delete phone_numbers" ON public.phone_numbers FOR DELETE TO authenticated USING (public.has_sales_role(ARRAY['admin']));

DROP POLICY IF EXISTS "Authenticated read contract_logs" ON public.contract_logs;
DROP POLICY IF EXISTS "Authenticated insert contract_logs" ON public.contract_logs;
DROP POLICY IF EXISTS "Authenticated update contract_logs" ON public.contract_logs;
DROP POLICY IF EXISTS "Authenticated delete contract_logs" ON public.contract_logs;
CREATE POLICY "Admins read contract_logs" ON public.contract_logs FOR SELECT TO authenticated USING (public.has_sales_role(ARRAY['admin']));
CREATE POLICY "Admins insert contract_logs" ON public.contract_logs FOR INSERT TO authenticated WITH CHECK (public.has_sales_role(ARRAY['admin']));
CREATE POLICY "Admins update contract_logs" ON public.contract_logs FOR UPDATE TO authenticated USING (public.has_sales_role(ARRAY['admin'])) WITH CHECK (public.has_sales_role(ARRAY['admin']));
CREATE POLICY "Admins delete contract_logs" ON public.contract_logs FOR DELETE TO authenticated USING (public.has_sales_role(ARRAY['admin']));

DROP POLICY IF EXISTS "Authenticated read sent_links" ON public.sent_links;
DROP POLICY IF EXISTS "Authenticated insert sent_links" ON public.sent_links;
DROP POLICY IF EXISTS "Authenticated update sent_links" ON public.sent_links;
DROP POLICY IF EXISTS "Authenticated delete sent_links" ON public.sent_links;
CREATE POLICY "Admins read sent_links" ON public.sent_links FOR SELECT TO authenticated USING (public.has_sales_role(ARRAY['admin']));
CREATE POLICY "Admins insert sent_links" ON public.sent_links FOR INSERT TO authenticated WITH CHECK (public.has_sales_role(ARRAY['admin']));
CREATE POLICY "Admins update sent_links" ON public.sent_links FOR UPDATE TO authenticated USING (public.has_sales_role(ARRAY['admin'])) WITH CHECK (public.has_sales_role(ARRAY['admin']));
CREATE POLICY "Admins delete sent_links" ON public.sent_links FOR DELETE TO authenticated USING (public.has_sales_role(ARRAY['admin']));

-- Call records: sales roles can use all rows; clinic setters can only use clinic CRM call rows.
DROP POLICY IF EXISTS "Authenticated read call_records" ON public.call_records;
DROP POLICY IF EXISTS "Authenticated insert call_records" ON public.call_records;
DROP POLICY IF EXISTS "Authenticated update call_records" ON public.call_records;
DROP POLICY IF EXISTS "Authenticated delete call_records" ON public.call_records;
CREATE POLICY "Sales roles read call_records" ON public.call_records FOR SELECT TO authenticated USING (public.has_sales_role(ARRAY['admin','rep']) OR (public.is_clinic_setter_user() AND clinic_id IS NOT NULL));
CREATE POLICY "Sales roles insert call_records" ON public.call_records FOR INSERT TO authenticated WITH CHECK (public.has_sales_role(ARRAY['admin','rep']) OR (public.is_clinic_setter_user() AND clinic_id IS NOT NULL AND lead_id IS NULL));
CREATE POLICY "Sales roles update call_records" ON public.call_records FOR UPDATE TO authenticated USING (public.has_sales_role(ARRAY['admin','rep']) OR (public.is_clinic_setter_user() AND clinic_id IS NOT NULL AND lead_id IS NULL)) WITH CHECK (public.has_sales_role(ARRAY['admin','rep']) OR (public.is_clinic_setter_user() AND clinic_id IS NOT NULL AND lead_id IS NULL));
CREATE POLICY "Sales roles delete call_records" ON public.call_records FOR DELETE TO authenticated USING (public.has_sales_role(ARRAY['admin','rep']));

-- SMS: clinic setters can only see and work with clinic-linked CRM threads/messages.
DROP POLICY IF EXISTS "Authenticated read sms_threads" ON public.sms_threads;
DROP POLICY IF EXISTS "Authenticated insert sms_threads" ON public.sms_threads;
DROP POLICY IF EXISTS "Authenticated update sms_threads" ON public.sms_threads;
DROP POLICY IF EXISTS "Authenticated delete sms_threads" ON public.sms_threads;
CREATE POLICY "Sales roles read sms_threads" ON public.sms_threads FOR SELECT TO authenticated USING (public.has_sales_role(ARRAY['admin','rep']) OR (public.is_clinic_setter_user() AND clinic_id IS NOT NULL));
CREATE POLICY "Sales roles insert sms_threads" ON public.sms_threads FOR INSERT TO authenticated WITH CHECK (public.has_sales_role(ARRAY['admin','rep']) OR (public.is_clinic_setter_user() AND clinic_id IS NOT NULL));
CREATE POLICY "Sales roles update sms_threads" ON public.sms_threads FOR UPDATE TO authenticated USING (public.has_sales_role(ARRAY['admin','rep']) OR (public.is_clinic_setter_user() AND clinic_id IS NOT NULL)) WITH CHECK (public.has_sales_role(ARRAY['admin','rep']) OR (public.is_clinic_setter_user() AND clinic_id IS NOT NULL));
CREATE POLICY "Sales roles delete sms_threads" ON public.sms_threads FOR DELETE TO authenticated USING (public.has_sales_role(ARRAY['admin','rep']));

DROP POLICY IF EXISTS "Authenticated read sms_messages" ON public.sms_messages;
DROP POLICY IF EXISTS "Authenticated insert sms_messages" ON public.sms_messages;
DROP POLICY IF EXISTS "Authenticated update sms_messages" ON public.sms_messages;
DROP POLICY IF EXISTS "Authenticated delete sms_messages" ON public.sms_messages;
CREATE POLICY "Sales roles read sms_messages" ON public.sms_messages FOR SELECT TO authenticated USING (
  public.has_sales_role(ARRAY['admin','rep']) OR (
    public.is_clinic_setter_user() AND EXISTS (
      SELECT 1 FROM public.sms_threads st WHERE st.id = sms_messages.thread_id AND st.clinic_id IS NOT NULL
    )
  )
);
CREATE POLICY "Sales roles insert sms_messages" ON public.sms_messages FOR INSERT TO authenticated WITH CHECK (
  public.has_sales_role(ARRAY['admin','rep']) OR (
    public.is_clinic_setter_user() AND EXISTS (
      SELECT 1 FROM public.sms_threads st WHERE st.id = sms_messages.thread_id AND st.clinic_id IS NOT NULL
    )
  )
);
CREATE POLICY "Sales roles update sms_messages" ON public.sms_messages FOR UPDATE TO authenticated USING (
  public.has_sales_role(ARRAY['admin','rep']) OR (
    public.is_clinic_setter_user() AND EXISTS (
      SELECT 1 FROM public.sms_threads st WHERE st.id = sms_messages.thread_id AND st.clinic_id IS NOT NULL
    )
  )
) WITH CHECK (
  public.has_sales_role(ARRAY['admin','rep']) OR (
    public.is_clinic_setter_user() AND EXISTS (
      SELECT 1 FROM public.sms_threads st WHERE st.id = sms_messages.thread_id AND st.clinic_id IS NOT NULL
    )
  )
);
CREATE POLICY "Sales roles delete sms_messages" ON public.sms_messages FOR DELETE TO authenticated USING (public.has_sales_role(ARRAY['admin','rep']));

-- Clinic appointments are not part of the clinic acquisition CRM for clinic setters.
DROP POLICY IF EXISTS "rep insert clinic_appointments" ON public.clinic_appointments;
DROP POLICY IF EXISTS "rep read clinic_appointments" ON public.clinic_appointments;
DROP POLICY IF EXISTS "rep update clinic_appointments" ON public.clinic_appointments;
CREATE POLICY "Sales reps insert clinic_appointments" ON public.clinic_appointments FOR INSERT TO authenticated WITH CHECK (public.has_sales_role(ARRAY['admin','rep']));
CREATE POLICY "Sales reps read clinic_appointments" ON public.clinic_appointments FOR SELECT TO authenticated USING (public.has_sales_role(ARRAY['admin','rep']));
CREATE POLICY "Sales reps update clinic_appointments" ON public.clinic_appointments FOR UPDATE TO authenticated USING (public.has_sales_role(ARRAY['admin','rep'])) WITH CHECK (public.has_sales_role(ARRAY['admin','rep']));