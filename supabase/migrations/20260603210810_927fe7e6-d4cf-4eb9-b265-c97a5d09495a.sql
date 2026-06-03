CREATE POLICY "Admins manage document files" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'documents' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'documents' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated read document files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'documents');