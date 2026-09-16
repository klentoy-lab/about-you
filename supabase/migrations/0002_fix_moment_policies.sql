-- Fix: saving moments failed with "new row violates row-level security policy for table moments".
--
-- The app saves with INSERT ... ON CONFLICT DO UPDATE (supabase-js .upsert()). For that command
-- Postgres also checks the table's SELECT policy against the *new* row. The old read policy for
-- moments called can_read_content(entry_id, id), which looks the moment up by id — and a moment being
-- saved for the first time isn't in the table yet, so the check always failed.
--
-- The read rules below judge a row by its own columns plus its entry, never by looking itself up.
-- Who may read what is unchanged:
--   owner    — everything of their own, except a sealed (Lockbin) entry while the Lockbin is locked
--   anyone   — public, non-sealed entries; and within them, public moments only

create or replace function private.owner_can_read_entry(p_entry_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.entries e
    where e.id = p_entry_id
      and e.owner_id = (select auth.uid())
      and (not e.in_lockbin or private.lockbin_open())
  )
$$;

create or replace function private.entry_is_public(p_entry_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.entries e
    where e.id = p_entry_id and e.visibility = 'public' and not e.in_lockbin
  )
$$;

create or replace function private.moment_is_public(p_moment_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.moments m where m.id = p_moment_id and m.visibility = 'public')
$$;

revoke all on function private.owner_can_read_entry(uuid) from public;
revoke all on function private.entry_is_public(uuid) from public;
revoke all on function private.moment_is_public(uuid) from public;
grant execute on function private.owner_can_read_entry(uuid) to anon, authenticated;
grant execute on function private.entry_is_public(uuid) to anon, authenticated;
grant execute on function private.moment_is_public(uuid) to anon, authenticated;

-- moments: judged by the row's own owner and visibility
drop policy if exists "read moments" on public.moments;
create policy "read moments" on public.moments for select
  using (
    (owner_id = (select auth.uid()) and private.owner_can_read_entry(entry_id))
    or (visibility = 'public' and private.entry_is_public(entry_id))
  );

-- photos, stickers and songs: same shape, plus the moment's visibility when attached to one
do $$
declare t text;
begin
  foreach t in array array['media_items', 'canvas_items', 'tracks'] loop
    execute format('drop policy if exists "read %1$s" on public.%1$I', t);
    execute format($f$
      create policy "read %1$s" on public.%1$I for select
        using (
          (owner_id = (select auth.uid()) and private.owner_can_read_entry(entry_id))
          or (private.entry_is_public(entry_id) and (moment_id is null or private.moment_is_public(moment_id)))
        );
    $f$, t);
  end loop;
end $$;
