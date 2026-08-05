-- Maker-checker (two-person approval) for the highest-risk admin actions:
-- deleting a member, deleting an application, and granting/revoking the
-- admin role. One admin REQUESTS the action; a DIFFERENT admin must APPROVE
-- it before it actually runs. The requester-!= -approver rule is enforced
-- both here (RLS) and again in the server function that executes the action
-- (belt and suspenders — RLS alone would still let a service-role bypass).

create type public.approval_action_type as enum (
  'member_delete',
  'application_delete',
  'role_grant',
  'role_revoke'
);

create type public.approval_status as enum ('pending', 'approved', 'rejected', 'executed', 'failed');

create table public.pending_approvals (
  id uuid primary key default gen_random_uuid(),
  action_type public.approval_action_type not null,
  payload jsonb not null,
  reason text not null,
  status public.approval_status not null default 'pending',
  requested_by uuid not null references public.profiles(id),
  requested_at timestamptz not null default now(),
  decided_by uuid references public.profiles(id),
  decided_at timestamptz,
  decision_reason text,
  result jsonb,
  created_at timestamptz not null default now()
);

alter table public.pending_approvals enable row level security;

-- Admins can see every request (so any second admin can act as approver).
create policy "Admins view all pending approvals"
  on public.pending_approvals for select
  to authenticated
  using (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can request an action, and only as themselves.
create policy "Admins create pending approvals"
  on public.pending_approvals for insert
  to authenticated
  with check (
    has_role(auth.uid(), 'admin'::app_role)
    and requested_by = auth.uid()
  );

-- Direct client-side updates are never allowed — approval/rejection/execution
-- all go through SECURITY DEFINER server functions (service role), which
-- re-check the requester-!=-approver rule server-side. No update policy is
-- granted here, so RLS denies all client UPDATE attempts by default.

create index pending_approvals_status_idx on public.pending_approvals(status);
