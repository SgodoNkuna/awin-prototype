-- Delete-submission button (admin-only, type-to-confirm, two-person approved)
-- needs its own approval_action_type value, same pattern as every other
-- action added to pending_approvals since the original 4.
ALTER TYPE public.approval_action_type ADD VALUE IF NOT EXISTS 'loa_rpa_submission_delete';
