-- Perf indexes + rate_limits retention (applied via MCP 2026-07-16)

-- Index the user_id columns that drive RLS (auth.uid() = user_id) and portal
-- filters. Previously only payments had one; portal + onboarding seq-scanned.
create index if not exists applications_user_id_idx on public.applications(user_id);
create index if not exists event_registrations_user_id_idx on public.event_registrations(user_id);

-- rate_limits: index the sweep column + opportunistic prune so rotating keys
-- (a spammer cycling From addresses) can't bloat the table indefinitely.
create index if not exists rate_limits_window_start_idx on public.rate_limits(window_start);

create or replace function public.rate_limit_hit(_key text, _max int, _window_seconds int)
returns boolean language plpgsql security definer set search_path = public as $$
declare _count int;
begin
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;
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
