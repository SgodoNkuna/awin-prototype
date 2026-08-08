-- committee_order/committee_position are shared across every committee a
-- person is on, which breaks the moment someone's rank differs between
-- committees (e.g. Thuli Mdluli chairs Website Committee but isn't on Main
-- Committee at all, while people like Phumelele are senior on Main but
-- should rank behind her on Website). Give Website Committee its own
-- order/position columns; falls back to the shared columns for anyone
-- who's only ever been on one committee.
alter table public.team_members add column if not exists website_committee_order integer;
alter table public.team_members add column if not exists website_committee_position text;
