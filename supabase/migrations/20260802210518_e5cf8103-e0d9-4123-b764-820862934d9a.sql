DROP POLICY IF EXISTS "Media public read" ON storage.objects;

DROP POLICY IF EXISTS "Media admin read" ON storage.objects;
CREATE POLICY "Media admin read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'media'
  AND (
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR private.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
);