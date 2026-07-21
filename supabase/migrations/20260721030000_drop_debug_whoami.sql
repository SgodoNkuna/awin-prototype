-- _whoami was a debugging helper (returns caller's auth role/uid); unused by the app
-- and flagged by the security linter for a mutable search_path. Safe to remove.
DROP FUNCTION IF EXISTS public._whoami();
