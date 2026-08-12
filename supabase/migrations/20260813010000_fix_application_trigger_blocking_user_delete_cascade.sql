-- restrict_application_self_update() blocked ANY change to applications.user_id
-- from a non-admin session — including the ON DELETE SET NULL cascade fired
-- when the linked auth user is deleted. That cascade runs with no admin JWT
-- in context, so has_role(auth.uid(), 'admin') was false and the trigger
-- raised "Not permitted to change this field", which auth.admin.deleteUser()
-- surfaced as a generic "Database error deleting user" — blocking deletion
-- of any member/admin who had ever submitted an application.
create or replace function public.restrict_application_self_update()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  -- The FK cascade signature: user_id nulled, nothing else touched. Allow it
  -- regardless of role — a real self-service update never does this alone.
  if new.user_id is null and old.user_id is not null
     and new.status is not distinct from old.status
     and new.admin_notes is not distinct from old.admin_notes
     and new.tier is not distinct from old.tier
     and new.reviewed_at is not distinct from old.reviewed_at
     and new.reviewed_by is not distinct from old.reviewed_by
     and new.decided_at is not distinct from old.decided_at
     and new.status_updated_at is not distinct from old.status_updated_at
     and new.pop_status is not distinct from old.pop_status
     and new.pop_reviewed_at is not distinct from old.pop_reviewed_at
     and new.pop_reviewed_by is not distinct from old.pop_reviewed_by
     and new.pop_review_notes is not distinct from old.pop_review_notes
  then
    return new;
  end if;

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
$function$;
