-- POP review workflow + event gallery (applied remotely via MCP on 2026-07-15)

alter table public.applications
  add column if not exists pop_status text not null default 'awaiting'
    check (pop_status in ('awaiting','pending_review','verified','rejected')),
  add column if not exists pop_reviewed_at timestamptz,
  add column if not exists pop_review_notes text,
  add column if not exists stamped_document_path text,
  add column if not exists admin_notes text;

create or replace function public.applications_pop_autoflip()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.proof_of_payment_path is not null
     and (tg_op = 'INSERT' or old.proof_of_payment_path is distinct from new.proof_of_payment_path)
     and new.pop_status = 'awaiting' then
    new.pop_status := 'pending_review';
  end if;
  return new;
end $$;

drop trigger if exists trg_applications_pop_autoflip on public.applications;
create trigger trg_applications_pop_autoflip
  before insert or update of proof_of_payment_path on public.applications
  for each row execute function public.applications_pop_autoflip();

create table if not exists public.event_gallery (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('hike','wcw','coaching','other')),
  storage_path text not null,
  caption text,
  event_label text,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.event_gallery enable row level security;

drop policy if exists "Admins manage event_gallery" on public.event_gallery;
create policy "Admins manage event_gallery" on public.event_gallery
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Anyone reads visible gallery rows" on public.event_gallery;
create policy "Anyone reads visible gallery rows" on public.event_gallery
  for select to anon, authenticated
  using (is_visible = true or public.has_role(auth.uid(), 'admin'));

grant select on public.event_gallery to anon, authenticated;
grant all on public.event_gallery to authenticated;

insert into storage.buckets (id, name, public)
values ('event-gallery','event-gallery',false)
on conflict (id) do nothing;

drop policy if exists "Admins manage event-gallery files" on storage.objects;
create policy "Admins manage event-gallery files" on storage.objects
  for all to authenticated
  using (bucket_id = 'event-gallery' and public.has_role(auth.uid(), 'admin'))
  with check (bucket_id = 'event-gallery' and public.has_role(auth.uid(), 'admin'));
