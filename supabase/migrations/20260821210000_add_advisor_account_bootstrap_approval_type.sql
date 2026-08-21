-- Advisor account creation moved from an immediate-execute A-Win-admin-only
-- action to a ThuthukaSA-requestable, admin-approved one (same two-person
-- flow as every other privileged change) — needs its own approval_action_type.
alter type public.approval_action_type add value if not exists 'advisor_account_bootstrap';
