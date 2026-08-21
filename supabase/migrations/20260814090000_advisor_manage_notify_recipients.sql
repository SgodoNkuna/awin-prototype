-- Advisory notification recipients ("who gets copied when a new LOA/RPA
-- submission comes in") is genuinely ThuthukaSA's own setting, not A-Win's —
-- previously it was admin-only (and two-person-approval-gated) purely
-- because it lived under the general site_settings table's RLS, not because
-- of any real compliance reason. Scope a narrow policy to just this one key
-- so advisors can self-manage it directly from /tksa, with no A-Win admin
-- involvement needed and no wider access to any other site setting.
create policy "Advisors manage notify recipients"
  on public.site_settings for all
  to authenticated
  using (key = 'notify_recipients' and has_role(auth.uid(), 'advisor'::app_role))
  with check (key = 'notify_recipients' and has_role(auth.uid(), 'advisor'::app_role));
