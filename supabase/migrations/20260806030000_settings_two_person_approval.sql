-- Extend the two-person approval system ([[20260806020000_two_person_approval]])
-- to every write action on the Admin > Settings page: publishing a content
-- key (hero/stats/eft_banking/contact_info/faq/notifications), adding/
-- editing/deleting an "Our Members" team profile, and the three Danger Zone
-- bulk-delete actions. Same maker-checker rule: request now, a different
-- admin approves before it actually runs.
alter type public.approval_action_type add value 'site_settings_update';
alter type public.approval_action_type add value 'team_member_upsert';
alter type public.approval_action_type add value 'team_member_delete';
alter type public.approval_action_type add value 'settings_danger_action';
