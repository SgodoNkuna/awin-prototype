-- Missing column caused "Could not find pop_reviewed_by" errors in the EFT
-- verify/reject flow (applied via MCP 2026-07-21).
alter table public.applications add column if not exists pop_reviewed_by uuid references auth.users(id);
