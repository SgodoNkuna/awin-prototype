ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS committee text,
  ADD COLUMN IF NOT EXISTS committee_position text,
  ADD COLUMN IF NOT EXISTS committee_order integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS team_members_committee_idx
  ON public.team_members (committee, committee_order);