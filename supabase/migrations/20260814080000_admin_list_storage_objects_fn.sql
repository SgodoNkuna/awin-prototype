-- storage.objects isn't exposed via PostgREST (by design — Storage has its
-- own dedicated API). Admin > Storage needs bucket/size/file listings across
-- everything, so expose it through a SECURITY DEFINER function instead.
--
-- Called only via supabaseAdmin (service role) from a server function that
-- has already gated the caller with ensureAdmin() — auth.uid() is null under
-- service role, so a has_role(auth.uid(), ...) check inside this function
-- would always fail. Authorization already happened one layer up (same
-- trust pattern as every other supabaseAdmin call in this codebase, e.g.
-- executeDeleteMember) — this function just needs to be unreachable by
-- anyone calling it directly, which the revoke below handles.
create or replace function public.admin_list_storage_objects()
returns table (bucket_id text, name text, size bigint, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $function$
begin
  return query
    select o.bucket_id, o.name, coalesce((o.metadata->>'size')::bigint, 0), o.created_at
    from storage.objects o;
end;
$function$;

revoke all on function public.admin_list_storage_objects() from anon, authenticated;
grant execute on function public.admin_list_storage_objects() to service_role;
