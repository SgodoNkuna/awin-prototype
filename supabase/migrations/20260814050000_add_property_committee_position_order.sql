alter table public.team_members
  add column if not exists property_committee_position text,
  add column if not exists property_committee_order integer;
