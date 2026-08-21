-- Read-only visibility for advisors into approval requests concerning THEIR
-- data specifically (loa_rpa_submission_delete) — they can see a deletion
-- was requested/decided and why, without gaining the ability to approve or
-- reject it themselves. Deleting FAIS-regulated submissions stays with
-- A-Win's own accountable admins (a different, different-admin approval) —
-- this is visibility only, not a change to who can decide.
create policy "Advisors view LOA/RPA approval requests"
  on public.pending_approvals for select
  to authenticated
  using (action_type = 'loa_rpa_submission_delete' and has_role(auth.uid(), 'advisor'::app_role));
