-- 1. Replace open RLS policies with authenticated-only on every public table
DO $$
DECLARE
  tbl text;
  pol record;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'clients','call_records','clinics','clinic_contacts',
    'sms_threads','sms_messages','contract_logs','error_logs'
  ])
  LOOP
    -- Drop every existing policy on the table
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname='public' AND tablename=tbl
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
    END LOOP;
    -- Make sure RLS is on
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', tbl);
  END LOOP;
END $$;

-- Authenticated-only policies for each table
CREATE POLICY "Authenticated read clients" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update clients" ON public.clients FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete clients" ON public.clients FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated read call_records" ON public.call_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert call_records" ON public.call_records FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update call_records" ON public.call_records FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete call_records" ON public.call_records FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated read clinics" ON public.clinics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert clinics" ON public.clinics FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update clinics" ON public.clinics FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete clinics" ON public.clinics FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated read clinic_contacts" ON public.clinic_contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert clinic_contacts" ON public.clinic_contacts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update clinic_contacts" ON public.clinic_contacts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete clinic_contacts" ON public.clinic_contacts FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated read sms_threads" ON public.sms_threads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert sms_threads" ON public.sms_threads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update sms_threads" ON public.sms_threads FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete sms_threads" ON public.sms_threads FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated read sms_messages" ON public.sms_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert sms_messages" ON public.sms_messages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update sms_messages" ON public.sms_messages FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete sms_messages" ON public.sms_messages FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated read contract_logs" ON public.contract_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert contract_logs" ON public.contract_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update contract_logs" ON public.contract_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete contract_logs" ON public.contract_logs FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated read error_logs" ON public.error_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert error_logs" ON public.error_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update error_logs" ON public.error_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete error_logs" ON public.error_logs FOR DELETE TO authenticated USING (true);

-- 2. Lock down sms-media storage bucket
UPDATE storage.buckets SET public = false WHERE id = 'sms-media';

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname IN (
        'Anyone can read sms media','Anyone can upload sms media',
        'Anyone can update sms media','Anyone can delete sms media',
        'Public can read sms media','Public sms media access'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Authenticated read sms media"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'sms-media');

CREATE POLICY "Authenticated upload sms media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'sms-media');

CREATE POLICY "Authenticated update sms media"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'sms-media') WITH CHECK (bucket_id = 'sms-media');

CREATE POLICY "Authenticated delete sms media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'sms-media');
