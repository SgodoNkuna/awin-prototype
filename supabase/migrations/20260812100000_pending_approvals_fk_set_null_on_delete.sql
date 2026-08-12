-- pending_approvals.requested_by/decided_by referenced profiles(id) with no
-- ON DELETE behavior (default RESTRICT). Deleting a member/admin who had
-- ever filed or decided ANY pending_approvals request — e.g. a test/demo
-- admin account used during development — failed with a foreign key
-- violation from Admin > Approvals, since executeDeleteMember's
-- auth.admin.deleteUser() cascades into profiles but pending_approvals still
-- pointed at that row. SET NULL instead: the request/decision history stays,
-- just loses the "who" attribution once that account is gone (same tradeoff
-- already used for team_members.member_id).

alter table public.pending_approvals alter column requested_by drop not null;

alter table public.pending_approvals drop constraint pending_approvals_requested_by_fkey;
alter table public.pending_approvals add constraint pending_approvals_requested_by_fkey
  foreign key (requested_by) references public.profiles(id) on delete set null;

alter table public.pending_approvals drop constraint pending_approvals_decided_by_fkey;
alter table public.pending_approvals add constraint pending_approvals_decided_by_fkey
  foreign key (decided_by) references public.profiles(id) on delete set null;
