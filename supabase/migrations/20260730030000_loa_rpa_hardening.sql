-- Security review follow-up (Option B, LOA/RPA): the initial migration let any
-- anon/authenticated caller insert unlimited rows via direct API calls, with
-- ID-number format checked client-side only, and unrestricted file uploads to
-- the storage bucket. This closes all three gaps.

-- 1. Let anon/authenticated call the existing rate-limit helper (previously
--    only postgres/service_role could — it was only ever called server-side).
GRANT EXECUTE ON FUNCTION public.rate_limit_hit(text, integer, integer) TO anon, authenticated;

-- 2. Rate-limit the write itself (not just the follow-up email): 5 submissions
--    per email address per hour, enforced in RLS so a direct API call can't
--    bypass it. Matches the contact-form precedent (5/addr/hr).
DROP POLICY IF EXISTS "Anyone can submit LOA RPA forms" ON public.loa_rpa_submissions;
CREATE POLICY "Anyone can submit LOA RPA forms"
  ON public.loa_rpa_submissions FOR INSERT TO anon, authenticated
  WITH CHECK (public.rate_limit_hit('loa_rpa_submit:' || lower(email), 5, 3600));

-- 3. Enforce the SA ID number format (13 digits) at the database layer, not
--    just in the browser form.
ALTER TABLE public.loa_rpa_submissions
  ADD CONSTRAINT loa_rpa_submissions_id_number_format
  CHECK (loa_data ? 'idNumber' AND (loa_data->>'idNumber') ~ '^\d{13}$');

-- 4. Restrict the storage bucket to PDFs under 2MB, closing the "anon can
--    dump arbitrary junk files" gap (generated PDFs here run ~6KB).
UPDATE storage.buckets
SET file_size_limit = 2097152, allowed_mime_types = ARRAY['application/pdf']
WHERE id = 'loa-rpa-documents';
