-- Links a public directory/committee card (team_members) to the actual
-- member login account (profiles) it belongs to, when one exists. Previously
-- these were entirely unlinked tables — no way to know "this directory card
-- and this signed-up member are the same person" other than matching names
-- by eye. Nullable and SET NULL on delete: most team_members rows won't
-- have a matching account, and losing the account shouldn't take the public
-- card down with it.
alter table public.team_members
  add column if not exists member_profile_id uuid references public.profiles(id) on delete set null;
create index if not exists team_members_member_profile_id_idx on public.team_members(member_profile_id);
