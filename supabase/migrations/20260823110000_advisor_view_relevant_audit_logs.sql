-- RecentChangesCard on /tksa shows advisors their own access/delivery
-- history, but audit_logs was admin-only — advisors got 0 rows, silently.
-- Scoped to just the action types that card actually shows (not the full
-- admin audit trail, e.g. member deletions stay admin-only).
create policy "Advisors view relevant audit logs"
  on public.audit_logs for select
  to authenticated
  using (
    action in ('role_grant', 'role_revoke', 'advisor_account_bootstrap', 'site_settings_update', 'whatsapp_send_failed')
    and has_role(auth.uid(), 'advisor'::app_role)
  );
