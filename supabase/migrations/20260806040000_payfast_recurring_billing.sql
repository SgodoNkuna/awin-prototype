-- Support real PayFast recurring billing for the R500/month "active" tier
-- (previously a once-off card payment was mistakenly granting 12 months of
-- membership instead of 1). Track the subscription token so a member's
-- recurring charge can be identified and cancelled later.
alter table public.payments add column if not exists payfast_token text;
alter table public.profiles add column if not exists payfast_subscription_token text;
