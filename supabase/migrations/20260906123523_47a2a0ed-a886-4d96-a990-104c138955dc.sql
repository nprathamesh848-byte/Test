DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_read_own_or_admin" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'avatars'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin'))
  );