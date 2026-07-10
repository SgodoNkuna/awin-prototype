-- Idempotent seed of required storage buckets + policies.
-- Apply against your own Supabase project via `supabase db push` or the SQL Editor.
-- Safe to re-run.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'member-portfolios',
    'member-portfolios',
    false,
    10485760,
    array['image/jpeg','image/png','image/webp','image/gif','image/svg+xml']
  ),
  (
    'onboarding-uploads',
    'onboarding-uploads',
    false,
    10485760,
    array['image/jpeg','image/png','image/webp','application/pdf']
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'member_portfolios_admin_all'
  ) then
    create policy member_portfolios_admin_all on storage.objects
      for all to authenticated
      using (bucket_id = 'member-portfolios' and public.has_role(auth.uid(), 'admin'))
      with check (bucket_id = 'member-portfolios' and public.has_role(auth.uid(), 'admin'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'onboarding_owner_insert'
  ) then
    create policy onboarding_owner_insert on storage.objects
      for insert to authenticated
      with check (bucket_id = 'onboarding-uploads' and auth.uid()::text = (storage.foldername(name))[1]);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'onboarding_admin_read'
  ) then
    create policy onboarding_admin_read on storage.objects
      for select to authenticated
      using (bucket_id = 'onboarding-uploads' and public.has_role(auth.uid(), 'admin'));
  end if;
end $$;
