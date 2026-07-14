-- Event gallery + POP verification schema. Idempotent, safe to re-run.
-- Apply after the storage buckets seed on your connected Supabase.

create table if not exists public.event_gallery (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('hike','wcw','coaching','other')),
  storage_path text not null,
  caption text,
  event_label text,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

grant select on public.event_gallery to anon, authenticated;
grant insert, update, delete on public.event_gallery to authenticated;
grant all on public.event_gallery to service_role;

alter table public.event_gallery enable row level security;

drop policy if exists "event_gallery public read visible" on public.event_gallery;
create policy "event_gallery public read visible" on public.event_gallery
  for select to anon, authenticated
  using (is_visible = true or public.has_role(auth.uid(), 'admin'));

drop policy if exists "event_gallery admin write" on public.event_gallery;
create policy "event_gallery admin write" on public.event_gallery
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create index if not exists idx_event_gallery_cat_order on public.event_gallery (category, sort_order);

-- Storage bucket for event gallery (private, signed URLs)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-gallery','event-gallery',false,10485760,
        array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects'
                 and policyname='event_gallery_public_read') then
    create policy event_gallery_public_read on storage.objects
      for select to anon, authenticated
      using (bucket_id = 'event-gallery');
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects'
                 and policyname='event_gallery_admin_write') then
    create policy event_gallery_admin_write on storage.objects
      for all to authenticated
      using (bucket_id = 'event-gallery' and public.has_role(auth.uid(),'admin'))
      with check (bucket_id = 'event-gallery' and public.has_role(auth.uid(),'admin'));
  end if;
end $$;

-- POP verification fields on applications
alter table public.applications
  add column if not exists pop_status text not null default 'awaiting'
    check (pop_status in ('awaiting','pending_review','verified','rejected')),
  add column if not exists pop_reviewed_at timestamptz,
  add column if not exists pop_reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists pop_review_notes text,
  add column if not exists stamped_document_path text;

create or replace function public.applications_set_pop_pending()
returns trigger language plpgsql as $$
begin
  if new.proof_of_payment_path is not null
     and (old.proof_of_payment_path is distinct from new.proof_of_payment_path)
     and new.pop_status = 'awaiting' then
    new.pop_status := 'pending_review';
  end if;
  return new;
end $$;

drop trigger if exists trg_applications_pop_pending on public.applications;
create trigger trg_applications_pop_pending
  before insert or update of proof_of_payment_path on public.applications
  for each row execute function public.applications_set_pop_pending();
