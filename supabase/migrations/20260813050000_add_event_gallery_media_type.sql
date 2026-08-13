alter table public.event_gallery add column if not exists media_type text not null default 'photo';
