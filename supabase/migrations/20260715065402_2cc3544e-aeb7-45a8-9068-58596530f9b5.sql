-- Tighten mms-images bucket policies.
-- SELECT stays public (Twilio must fetch these URLs to deliver MMS to patients — the URLs contain random UUID paths).
-- INSERT stays authenticated (sales/clinic staff need to upload).
-- UPDATE / DELETE restricted to admins only, so a low-privilege staff account cannot overwrite or delete another user's uploaded MMS media.

DROP POLICY IF EXISTS "Authenticated update mms-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete mms-images" ON storage.objects;

CREATE POLICY "Admins update mms-images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'mms-images' AND public.is_admin_user())
  WITH CHECK (bucket_id = 'mms-images' AND public.is_admin_user());

CREATE POLICY "Admins delete mms-images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'mms-images' AND public.is_admin_user());