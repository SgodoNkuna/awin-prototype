-- Member Spotlights admin page managed this table, but nothing on the public
-- site ever read from it (the homepage "Member Portfolio" carousel reads
-- team_members instead) — confirmed empty (0 rows) before dropping.
DROP TABLE IF EXISTS public.portfolio_items;
