-- Lets registered members see if an event they signed up for has been
-- rescheduled or otherwise changed, surfaced in their portal.

create table public.event_changes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  summary text not null,
  changed_at timestamptz not null default now(),
  changed_by uuid references auth.users(id) on delete set null
);

alter table public.event_changes enable row level security;

-- Anyone can read change history for a published event (mirrors the events
-- table's own public-read policy); admins can always read.
create policy "Anyone can view changes for published events"
  on public.event_changes
  for select
  using (
    exists (
      select 1 from public.events e
      where e.id = event_changes.event_id and e.published = true
    )
    or has_role(auth.uid(), 'admin'::app_role)
  );

create policy "Admins insert event changes"
  on public.event_changes
  for insert
  with check (has_role(auth.uid(), 'admin'::app_role));

create index event_changes_event_id_idx on public.event_changes(event_id);
