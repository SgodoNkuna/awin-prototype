-- Client request (Wisani, ThuthukaSA, 2026-08-09): the LOA gets emailed
-- standalone to outside institutions (Astute, insurers) and must not carry
-- the applicant's RPA financial/risk answers along with it. Store the
-- standalone Letter of Authorisation PDF separately from the combined
-- LOA+RPA record kept for ThuthukaSA's internal file.
ALTER TABLE public.loa_rpa_submissions
  ADD COLUMN IF NOT EXISTS loa_pdf_path text;
