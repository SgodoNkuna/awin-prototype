
ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS social_url TEXT,
  ADD COLUMN IF NOT EXISTS portfolio_images TEXT[] NOT NULL DEFAULT '{}';
