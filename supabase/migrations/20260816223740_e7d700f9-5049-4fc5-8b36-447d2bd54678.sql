ALTER TABLE public.media_library ALTER COLUMN uploaded_by SET DEFAULT auth.uid();

CREATE POLICY "Users can insert their own media"
  ON public.media_library FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Users can read their own media"
  ON public.media_library FOR SELECT TO authenticated
  USING (uploaded_by = auth.uid());

CREATE POLICY "Users can upload own media objects"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media' AND owner = auth.uid());

CREATE POLICY "Users can read own media objects"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'media' AND owner = auth.uid());