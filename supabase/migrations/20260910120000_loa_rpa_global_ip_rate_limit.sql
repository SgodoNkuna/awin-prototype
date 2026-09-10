-- Per-email limiting alone is trivially bypassed by rotating the email
-- address on each submission. Add a global per-IP ceiling on top, keyed off
-- the x-forwarded-for header PostgREST exposes to RLS via the
-- `request.headers` GUC (Supabase's edge proxy sets this on every request).
-- Roomier than the per-email limit (10 vs 5) since one IP can legitimately
-- represent several real submitters (shared office wifi, a walk-in kiosk).
DROP POLICY IF EXISTS "Anyone can submit LOA RPA forms" ON public.loa_rpa_submissions;
CREATE POLICY "Anyone can submit LOA RPA forms"
  ON public.loa_rpa_submissions FOR INSERT TO anon, authenticated
  WITH CHECK (
    public.rate_limit_hit('loa_rpa_submit:' || lower(email), 5, 3600)
    AND public.rate_limit_hit(
      'loa_rpa_submit_ip:' || coalesce(
        nullif(split_part(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ',', 1), ''),
        'unknown'
      ),
      10,
      3600
    )
  );
