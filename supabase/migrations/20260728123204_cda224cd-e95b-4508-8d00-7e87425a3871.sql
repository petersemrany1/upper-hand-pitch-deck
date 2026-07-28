
CREATE POLICY "cf_photos_bucket_admin_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'clinicflow-photos' AND public.is_admin_user())
  WITH CHECK (bucket_id = 'clinicflow-photos' AND public.is_admin_user());

CREATE POLICY "cf_photos_bucket_clinic_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'clinicflow-photos'
    AND public.is_clinic_user_for(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "cf_photos_bucket_clinic_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'clinicflow-photos'
    AND public.is_clinic_user_for(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "cf_photos_bucket_clinic_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'clinicflow-photos'
    AND public.is_clinic_user_for(((storage.foldername(name))[1])::uuid)
  );
