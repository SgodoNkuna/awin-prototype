-- Flag an account for a mandatory password change on next sign-in (used
-- when the committee resets a shared/temp password). Covered by the
-- existing "Users update own profile" / "Admins update all profiles"
-- policies — no new RLS needed; this is a soft UX gate (redirect on login),
-- not a privilege boundary, since a user can only affect their own row.
alter table public.profiles
  add column if not exists force_password_change boolean not null default false;
