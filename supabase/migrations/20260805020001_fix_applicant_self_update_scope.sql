-- The previous migration's self-update trigger blocked full_name, phone,
-- id_number, occupation, employer, motivation and popia_consent — but the
-- connected onboarding flow legitimately needs the applicant to be able to
-- edit those same fields on their own pending application (that's the whole
-- point of not re-asking for details Apply Now already collected). Narrow
-- the trigger to only block genuinely committee/admin-controlled fields.

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
  then
    raise exception 'Not permitted to change this field';
  end if;

  return new;
end;
$$;
