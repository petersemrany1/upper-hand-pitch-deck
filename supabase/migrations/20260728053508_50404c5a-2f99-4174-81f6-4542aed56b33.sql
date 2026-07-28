-- Read: anyone (used on shareable consult pages)
CREATE POLICY "clinicflow_logos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'clinicflow-logos');

-- Write: admin or the clinic user whose clinic_id matches the first path segment
CREATE POLICY "clinicflow_logos_admin_write"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'clinicflow-logos' AND public.is_admin_user())
  WITH CHECK (bucket_id = 'clinicflow-logos' AND public.is_admin_user());

CREATE POLICY "clinicflow_logos_clinic_write"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'clinicflow-logos'
    AND public.is_clinic_user_for(((storage.foldername(name))[1])::uuid)
  )
  WITH CHECK (
    bucket_id = 'clinicflow-logos'
    AND public.is_clinic_user_for(((storage.foldername(name))[1])::uuid)
  );