-- Hearts on public entries, and public follower / following counts.
-- Run once in Supabase → SQL Editor, after 0001 and 0002.

-- ── hearts ───────────────────────────────────────────────────────────────────
create table if not exists public.hearts (
  entry_id    uuid not null references public.entries (id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (entry_id, user_id)
);

alter table public.hearts enable row level security;

-- a reader sees only their own hearts; totals come from heart_counts()
drop policy if exists "read own hearts" on public.hearts;
create policy "read own hearts" on public.hearts for select
  using (user_id = (select auth.uid()));

-- only signed-in readers, only for themselves, only on entries that are public right now
drop policy if exists "heart a public entry" on public.hearts;
create policy "heart a public entry" on public.hearts for insert
  with check (user_id = (select auth.uid()) and private.entry_is_public(entry_id));

drop policy if exists "take a heart back" on public.hearts;
create policy "take a heart back" on public.hearts for delete
  using (user_id = (select auth.uid()));

grant select, insert, delete on public.hearts to authenticated;

-- How many hearts each entry has. Private and sealed entries always count as none.
create or replace function public.heart_counts(entry_ids uuid[])
returns table (entry_id uuid, hearts bigint)
language sql stable security definer set search_path = '' as $$
  select h.entry_id, count(*)
  from public.hearts h
  where h.entry_id = any (entry_ids) and private.entry_is_public(h.entry_id)
  group by h.entry_id
$$;

revoke all on function public.heart_counts(uuid[]) from public;
grant execute on function public.heart_counts(uuid[]) to anon, authenticated;

-- ── follower counts ──────────────────────────────────────────────────────────
-- Who follows whom stays private; only the numbers are public.
create or replace function public.follow_counts(owner_ids uuid[])
returns table (owner_id uuid, followers bigint, following bigint)
language sql stable security definer set search_path = '' as $$
  select o.id,
         (select count(*) from public.follows f where f.owner_id = o.id),
         (select count(*) from public.follows f where f.follower_id = o.id)
  from unnest(owner_ids) as o (id)
$$;

revoke all on function public.follow_counts(uuid[]) from public;
grant execute on function public.follow_counts(uuid[]) to anon, authenticated;
