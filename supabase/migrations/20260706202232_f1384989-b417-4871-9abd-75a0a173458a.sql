
-- Admins manage all objects in member-portfolios; signed URLs handle public reads (they bypass RLS by design).
CREATE POLICY "Admins manage member-portfolios"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id = 'member-portfolios' AND public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (bucket_id = 'member-portfolios' AND public.has_role(auth.uid(), 'admin'::public.app_role));
