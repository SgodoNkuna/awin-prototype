-- Distinguish A-WIN-hosted events from community/partner events where A-WIN
-- members are encouraged to attend (applied via MCP 2026-07-21).
alter table public.events add column if not exists is_awin_hosted boolean not null default true;
comment on column public.events.is_awin_hosted is 'true = A-WIN runs/owns this event. false = a partner/community event A-WIN members are encouraged to attend (A-WIN may have a stall/table); ticket & payment logistics belong to the host, not A-WIN.';
