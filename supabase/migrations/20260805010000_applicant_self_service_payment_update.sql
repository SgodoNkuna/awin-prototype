-- Allow an applicant to update their own PENDING application to add proof of
-- payment / payment reference (the multi-step Apply Now wizard's "save and
-- continue later" step). Previously only admins had an UPDATE policy, so a
-- normal applicant's own save silently no-op'd under RLS.
--
-- A trigger enforces that non-admin self-updates can only touch the payment
-- fields — status, admin_notes, identity fields etc. remain admin-only, even
-- if a client sent other fields in the same request.

create or replace function public.restrict_application_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if has_role(auth.uid(), 'admin'::app_role) then
    return new;
  end if;

  if new.status is distinct from old.status
     or new.admin_notes is distinct from old.admin_notes
     or new.full_name is distinct from old.full_name
     or new.email is distinct from old.email
     or new.phone is distinct from old.phone
     or new.id_number is distinct from old.id_number
     or new.occupation is distinct from old.occupation
     or new.employer is distinct from old.employer
     or new.experience is distinct from old.experience
     or new.motivation is distinct from old.motivation
     or new.referral is distinct from old.referral
     or new.tier is distinct from old.tier
     or new.reviewed_at is distinct from old.reviewed_at
     or new.reviewed_by is distinct from old.reviewed_by
     or new.decided_at is distinct from old.decided_at
     or new.status_updated_at is distinct from old.status_updated_at
     or new.pop_status is distinct from old.pop_status
     or new.pop_reviewed_at is distinct from old.pop_reviewed_at
     or new.pop_reviewed_by is distinct from old.pop_reviewed_by
     or new.pop_review_notes is distinct from old.pop_review_notes
     or new.user_id is distinct from old.user_id
     or new.popia_consent is distinct from old.popia_consent
     or new.popia_consent_at is distinct from old.popia_consent_at
  then
    raise exception 'Not permitted to change this field';
  end if;

  return new;
end;
$$;

drop trigger if exists applications_restrict_self_update on public.applications;
create trigger applications_restrict_self_update
  before update on public.applications
  for each row execute function public.restrict_application_self_update();

create policy "Users update own pending application"
  on public.applications
  for update
  using (auth.uid() = user_id and status = 'pending')
  with check (auth.uid() = user_id and status = 'pending');
