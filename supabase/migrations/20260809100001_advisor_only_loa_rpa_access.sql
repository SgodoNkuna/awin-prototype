-- Confidentiality fix (Wisani, ThuthukaSA, 2026-08-09): stop letting generic
-- A-Win 'admin' accounts read/manage LOA & Risk Profile submissions and their
-- signed PDFs — only 'advisor' (ThuthukaSA) accounts may, since this data is
-- FAIS-regulated financial advice information, not A-Win membership data.
-- Public insert (the applicant's own submission) is untouched.

DROP POLICY IF EXISTS "Admins manage LOA RPA submissions" ON public.loa_rpa_submissions;
CREATE POLICY "Advisors manage LOA RPA submissions"
  ON public.loa_rpa_submissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'advisor'))
  WITH CHECK (public.has_role(auth.uid(), 'advisor'));

DROP POLICY IF EXISTS "Admins manage LOA RPA PDFs" ON storage.objects;
CREATE POLICY "Advisors manage LOA RPA PDFs"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'loa-rpa-documents' AND public.has_role(auth.uid(), 'advisor'))
WITH CHECK (bucket_id = 'loa-rpa-documents' AND public.has_role(auth.uid(), 'advisor'));
