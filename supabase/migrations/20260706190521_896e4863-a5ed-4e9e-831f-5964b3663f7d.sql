
-- Onboarding: add e-signature, consent and proof-of-payment fields to applications
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS agreement_version text,
  ADD COLUMN IF NOT EXISTS agreement_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS signature_typed_name text,
  ADD COLUMN IF NOT EXISTS signature_ip inet,
  ADD COLUMN IF NOT EXISTS signature_user_agent text,
  ADD COLUMN IF NOT EXISTS signature_doc_hash text,
  ADD COLUMN IF NOT EXISTS popia_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS popia_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS proof_of_payment_path text,
  ADD COLUMN IF NOT EXISTS proof_of_payment_uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_reference text;

-- Storage policies for onboarding-uploads bucket (private)
-- Users can upload/read their own files (path prefix must be their user id)
DROP POLICY IF EXISTS "Onboarding users can upload own files" ON storage.objects;
CREATE POLICY "Onboarding users can upload own files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'onboarding-uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Onboarding users can read own files" ON storage.objects;
CREATE POLICY "Onboarding users can read own files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'onboarding-uploads'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin')
  )
);

DROP POLICY IF EXISTS "Onboarding admins manage all files" ON storage.objects;
CREATE POLICY "Onboarding admins manage all files"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'onboarding-uploads' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'onboarding-uploads' AND public.has_role(auth.uid(), 'admin'));
