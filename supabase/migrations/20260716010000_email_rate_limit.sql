-- Sliding-window rate limit for public email endpoints (applied via MCP 2026-07-16)

create table if not exists public.rate_limits (
  key text primary key,
  count int not null default 0,
  window_start timestamptz not null default now()
);
alter table public.rate_limits enable row level security;
-- No policies: only the service role (bypasses RLS) reads/writes this.

-- Atomic sliding-window counter. Returns true if the hit is ALLOWED.
create or replace function public.rate_limit_hit(_key text, _max int, _window_seconds int)
returns boolean language plpgsql security definer set search_path = public as $$
declare _count int;
begin
  insert into public.rate_limits(key, count, window_start)
  values (_key, 1, now())
  on conflict (key) do update set
    count = case when public.rate_limits.window_start < now() - make_interval(secs => _window_seconds)
                 then 1 else public.rate_limits.count + 1 end,
    window_start = case when public.rate_limits.window_start < now() - make_interval(secs => _window_seconds)
                        then now() else public.rate_limits.window_start end
  returning count into _count;
  return _count <= _max;
end $$;

revoke execute on function public.rate_limit_hit(text, int, int) from anon, authenticated, public;
grant execute on function public.rate_limit_hit(text, int, int) to service_role;
