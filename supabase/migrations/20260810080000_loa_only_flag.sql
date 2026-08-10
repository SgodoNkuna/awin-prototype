-- LOA-only split (Phumelele, 2026-08-10): a short path with just the Letter
-- of Authority, no Risk Profile Analysis, for people who aren't joining
-- A-Win or just need Astute-facing paperwork. Flags which rows came from
-- that shorter form so the admin/advisor views can tell them apart instead
-- of inferring it from empty RPA fields.
ALTER TABLE public.loa_rpa_submissions
  ADD COLUMN IF NOT EXISTS loa_only boolean NOT NULL DEFAULT false;
