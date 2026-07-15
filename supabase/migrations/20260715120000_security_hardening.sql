-- Security hardening (applied remotely via MCP 2026-07-15)

-- Trigger functions must not be callable via /rest/v1/rpc. Triggers still fire
-- (they run as table owner), so revoking EXECUTE is safe. has_role is left
-- executable because RLS policies on every table depend on it.
revoke execute on function public.applications_pop_autoflip() from anon, authenticated, public;
revoke execute on function public.prevent_profile_privilege_escalation() from anon, authenticated, public;
revoke execute on function public.rls_auto_enable() from anon, authenticated, public;

-- Members can manage (cancel / re-confirm) their OWN event registrations.
-- Was missing, so the portal "cancel RSVP" update silently no-opped under RLS.
drop policy if exists "Users update own registrations" on public.event_registrations;
create policy "Users update own registrations" on public.event_registrations
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
