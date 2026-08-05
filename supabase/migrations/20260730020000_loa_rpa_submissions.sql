-- Phase 2 (Option B, signed 21 July 2026): WhatsApp-integrated LOA & RPA
-- document collection. loa_data/rpa_data are jsonb — flexible enough for the
-- real ThuthukaSA RPA questionnaire + Astute LOA fields.
CREATE TABLE IF NOT EXISTS public.loa_rpa_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES public.applications(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  source text NOT NULL DEFAULT 'website' CHECK (source IN ('whatsapp', 'website')),
  loa_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  rpa_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  privacy_consent boolean NOT NULL DEFAULT false,
  signature_type text NOT NULL CHECK (signature_type IN ('typed', 'drawn')),
  signature_typed_name text,
  signature_drawn_data text,
  signature_ip inet,
  signature_user_agent text,
  signature_doc_hash text,
  pdf_path text,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewed', 'archived')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS loa_rpa_submissions_created_at_idx ON public.loa_rpa_submissions (created_at DESC);
CREATE INDEX IF NOT EXISTS loa_rpa_submissions_application_id_idx ON public.loa_rpa_submissions (application_id);

ALTER TABLE public.loa_rpa_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit LOA RPA forms" ON public.loa_rpa_submissions;
CREATE POLICY "Anyone can submit LOA RPA forms"
  ON public.loa_rpa_submissions FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins manage LOA RPA submissions" ON public.loa_rpa_submissions;
CREATE POLICY "Admins manage LOA RPA submissions"
  ON public.loa_rpa_submissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT INSERT ON public.loa_rpa_submissions TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.loa_rpa_submissions TO authenticated;
GRANT ALL ON public.loa_rpa_submissions TO service_role;

-- Private storage bucket for generated LOA/RPA PDFs (mirrors onboarding-uploads).
INSERT INTO storage.buckets (id, name, public)
VALUES ('loa-rpa-documents', 'loa-rpa-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can upload LOA RPA PDFs" ON storage.objects;
CREATE POLICY "Anyone can upload LOA RPA PDFs"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'loa-rpa-documents');

DROP POLICY IF EXISTS "Admins manage LOA RPA PDFs" ON storage.objects;
CREATE POLICY "Admins manage LOA RPA PDFs"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'loa-rpa-documents' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'loa-rpa-documents' AND public.has_role(auth.uid(), 'admin'));
