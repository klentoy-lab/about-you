-- Ember — initial schema.
-- Visibility is enforced here, by row-level security. The client never filters:
-- a row the viewer may not see is simply never in the response.
--
-- Reading rules
--   Owner      sees every entry row (date, mood — enough for a sealed placeholder).
--              Sees content (moments, media, stickers, tracks) unless the entry is in
--              the Lockbin and their Lockbin session is closed.
--   Anyone     sees entry rows and content only when the entry is public, not in the
--              Lockbin, and (for content tied to a moment) the moment is public too.
--   Link-only  unlisted content is never selectable directly; it is served by
--              get_shared_entry(token), which checks the same conditions.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
grant usage on schema private to anon, authenticated;

create type public.visibility as enum ('private', 'unlisted', 'public');
create type public.media_layout as enum ('grid', 'collage');

-- ── Profiles ────────────────────────────────────────────────────────────────

-- Public face of a diary: safe for anyone to read.
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  handle      text unique check (handle ~ '^[a-z0-9_]{2,30}$'),
  owner_name  text not null default '',
  dedication  text not null default '',          -- blank falls back to owner_name in the UI
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Owner-only preferences.
create table public.account_settings (
  user_id             uuid primary key references auth.users (id) on delete cascade,
  default_visibility  public.visibility not null default 'private',
  updated_at          timestamptz not null default now()
);

-- ── Lockbin: a second factor over the account session ───────────────────────

-- No policies: unreadable through the API. Touched only by the functions below.
create table private.lockbin_secrets (
  user_id          uuid primary key references auth.users (id) on delete cascade,
  passcode_hash    text not null,
  failed_attempts  int not null default 0,
  locked_until     timestamptz
);

create table private.lockbin_sessions (
  user_id         uuid primary key references auth.users (id) on delete cascade,
  unlocked_until  timestamptz not null
);

create function private.lockbin_open() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from private.lockbin_sessions
    where user_id = (select auth.uid()) and unlocked_until > now()
  )
$$;

-- ── Entries and moments ─────────────────────────────────────────────────────

create table public.entries (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users (id) on delete cascade,
  entry_date    date not null,                    -- the writer's calendar day; backdating allowed
  mood          smallint check (mood between 1 and 5),
  visibility    public.visibility not null default 'private',
  in_lockbin    boolean not null default false,
  media_layout  public.media_layout not null default 'grid',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (owner_id, entry_date)
);
create index entries_public_idx on public.entries (owner_id, entry_date desc)
  where visibility = 'public' and not in_lockbin;

create table public.moments (
  id           uuid primary key default gen_random_uuid(),
  entry_id     uuid not null references public.entries (id) on delete cascade,
  owner_id     uuid not null references auth.users (id) on delete cascade,
  occurred_at  time not null default (now()::time),  -- editable HH:MM
  body         text not null default '',
  visibility   public.visibility not null default 'private',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index moments_entry_idx on public.moments (entry_id, occurred_at);
create index moments_fts_idx on public.moments using gin (to_tsvector('simple', body));

-- Can the current viewer read content attached to this entry (and moment, if given)?
-- security definer so the check itself isn't filtered by RLS; the logic is complete on its own.
create function private.can_read_content(p_entry_id uuid, p_moment_id uuid default null) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.entries e
    left join public.moments m on m.id = p_moment_id and m.entry_id = e.id
    where e.id = p_entry_id
      and (p_moment_id is null or m.id is not null)
      and (
        (e.owner_id = (select auth.uid()) and (not e.in_lockbin or private.lockbin_open()))
        or (
          not e.in_lockbin
          and e.visibility = 'public'
          and (p_moment_id is null or m.visibility = 'public')
        )
      )
  )
$$;

create function private.can_write_entry(p_entry_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.entries e
    where e.id = p_entry_id
      and e.owner_id = (select auth.uid())
      and (not e.in_lockbin or private.lockbin_open())
  )
$$;

-- ── Attached content ────────────────────────────────────────────────────────

create table public.media_items (
  id            uuid primary key default gen_random_uuid(),
  entry_id      uuid not null references public.entries (id) on delete cascade,
  moment_id     uuid references public.moments (id) on delete cascade,
  owner_id      uuid not null references auth.users (id) on delete cascade,
  kind          text not null check (kind in ('photo', 'video')),
  storage_path  text not null unique,             -- media bucket: {owner_id}/{entry_id}/{file}
  mime_type     text,
  file_name     text,
  width         int,
  height        int,
  duration      real,                             -- seconds, videos only
  caption       text not null default '',
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);

-- Stickers and GIFs placed on the canvas.
create table public.canvas_items (
  id          uuid primary key default gen_random_uuid(),
  entry_id    uuid not null references public.entries (id) on delete cascade,
  moment_id   uuid references public.moments (id) on delete cascade,
  owner_id    uuid not null references auth.users (id) on delete cascade,
  kind        text not null check (kind in ('sticker', 'gif')),
  source      text not null,                      -- built-in sticker id, or Giphy id
  title       text not null default '',
  src_url     text,                               -- GIF image URL (null for built-in stickers)
  preview_url text,
  x           real not null,                      -- centre, fraction of canvas width (may exceed 1: break-out)
  y           real not null,                      -- centre, pixels from canvas top (stays beside its text)
  width       real not null,                      -- fraction of canvas width
  aspect      real not null default 1,            -- height / width
  rotation    real not null default 0,            -- degrees
  z           int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.tracks (
  id              uuid primary key default gen_random_uuid(),
  entry_id        uuid not null references public.entries (id) on delete cascade,
  moment_id       uuid references public.moments (id) on delete cascade,  -- null + is_track_of_day for the entry's song
  owner_id        uuid not null references auth.users (id) on delete cascade,
  is_track_of_day boolean not null default false,
  kind            text not null check (kind in ('upload', 'link')),
  provider        text check (provider in ('spotify', 'youtube', 'soundcloud', 'apple_music')),
  url             text,
  storage_path    text unique,
  title           text,
  artist          text,
  artwork_url     text,
  spotify_kind    text check (spotify_kind in ('track', 'album', 'playlist', 'episode', 'show')),
  spotify_id      text,
  note            text not null default '',       -- "a note with the song"
  duration_ms     int,
  created_at      timestamptz not null default now(),
  check ((kind = 'upload') = (storage_path is not null)),
  check ((kind = 'link') = (url is not null))
);
create unique index tracks_one_of_day on public.tracks (entry_id) where is_track_of_day;

-- ── Sharing, following, views ───────────────────────────────────────────────

create table public.share_links (
  token       text primary key default encode(extensions.gen_random_bytes(18), 'hex'),
  entry_id    uuid not null references public.entries (id) on delete cascade,
  owner_id    uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table public.follows (
  follower_id  uuid not null references auth.users (id) on delete cascade,
  owner_id     uuid not null references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, owner_id),
  check (follower_id <> owner_id)
);

create table public.entry_views (
  entry_id  uuid primary key references public.entries (id) on delete cascade,
  count     bigint not null default 0
);

-- ── Row-level security ──────────────────────────────────────────────────────

alter table public.profiles         enable row level security;
alter table public.account_settings enable row level security;
alter table public.entries          enable row level security;
alter table public.moments          enable row level security;
alter table public.media_items      enable row level security;
alter table public.canvas_items     enable row level security;
alter table public.tracks           enable row level security;
alter table public.share_links      enable row level security;
alter table public.follows          enable row level security;
alter table public.entry_views      enable row level security;

-- profiles
create policy "profiles are public" on public.profiles for select using (true);
create policy "own profile insert" on public.profiles for insert with check (id = (select auth.uid()));
create policy "own profile update" on public.profiles for update using (id = (select auth.uid()));

-- account_settings
create policy "own settings" on public.account_settings for all
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- entries: owner sees all rows (placeholders included); others see public, non-Lockbin rows
create policy "owner reads entries" on public.entries for select
  using (owner_id = (select auth.uid()));
create policy "anyone reads public entries" on public.entries for select
  using (visibility = 'public' and not in_lockbin);
create policy "owner creates entries" on public.entries for insert
  with check (owner_id = (select auth.uid()));
-- Editing (or moving out of) a Lockbin entry needs an open Lockbin; moving in does not.
create policy "owner updates entries" on public.entries for update
  using (owner_id = (select auth.uid()) and (not in_lockbin or private.lockbin_open()))
  with check (owner_id = (select auth.uid()));
create policy "owner deletes entries" on public.entries for delete
  using (owner_id = (select auth.uid()) and (not in_lockbin or private.lockbin_open()));

-- moments and every kind of attached content share one rule set
do $$
declare t text;
begin
  foreach t in array array['moments', 'media_items', 'canvas_items', 'tracks'] loop
    execute format($f$
      create policy "read %1$s" on public.%1$I for select
        using (private.can_read_content(entry_id, %2$s));
      create policy "insert %1$s" on public.%1$I for insert
        with check (owner_id = (select auth.uid()) and private.can_write_entry(entry_id));
      create policy "update %1$s" on public.%1$I for update
        using (owner_id = (select auth.uid()) and private.can_write_entry(entry_id))
        with check (owner_id = (select auth.uid()) and private.can_write_entry(entry_id));
      create policy "delete %1$s" on public.%1$I for delete
        using (owner_id = (select auth.uid()) and private.can_write_entry(entry_id));
    $f$, t, case when t = 'moments' then 'id' else 'moment_id' end);
  end loop;
end $$;

-- share_links: owner manages; visitors resolve through get_shared_entry()
create policy "own share links" on public.share_links for all
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()) and private.can_write_entry(entry_id));

-- follows: a follower manages their own; an owner may see who follows them
create policy "read follows" on public.follows for select
  using (follower_id = (select auth.uid()) or owner_id = (select auth.uid()));
create policy "follow" on public.follows for insert with check (follower_id = (select auth.uid()));
create policy "unfollow" on public.follows for delete using (follower_id = (select auth.uid()));

-- entry_views: the count is for the owner's eyes only; written via record_entry_view()
create policy "owner reads view counts" on public.entry_views for select
  using (exists (select 1 from public.entries e where e.id = entry_id and e.owner_id = (select auth.uid())));

-- ── Storage: media bucket mirrors media_items / tracks visibility ──────────

insert into storage.buckets (id, name, public) values ('media', 'media', false)
  on conflict (id) do nothing;

create policy "read media objects" on storage.objects for select
  using (
    bucket_id = 'media' and (
      exists (select 1 from public.media_items mi where mi.storage_path = storage.objects.name)  -- RLS on media_items applies
      or exists (select 1 from public.tracks tr where tr.storage_path = storage.objects.name)
    )
  );
create policy "upload own media" on storage.objects for insert
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "delete own media" on storage.objects for delete
  using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ── Functions ───────────────────────────────────────────────────────────────

create function private.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger entries_touch  before update on public.entries      for each row execute function private.touch_updated_at();
create trigger moments_touch  before update on public.moments      for each row execute function private.touch_updated_at();
create trigger canvas_touch   before update on public.canvas_items for each row execute function private.touch_updated_at();
create trigger profiles_touch before update on public.profiles     for each row execute function private.touch_updated_at();

-- Moving into the Lockbin kills every share link at once, so no cached link keeps working.
create function private.on_lockbin_move() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.in_lockbin and not old.in_lockbin then
    delete from public.share_links where entry_id = new.id;
  end if;
  return new;
end $$;
create trigger entries_lockbin after update of in_lockbin on public.entries
  for each row execute function private.on_lockbin_move();

-- New accounts get a profile and settings row.
create function private.on_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.account_settings (user_id) values (new.id);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.on_new_user();

-- Lockbin passcode. Requires an authenticated session: it layers on top of login, never replaces it.
create function public.set_lockbin_passcode(p_new text, p_current text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); existing text;
begin
  if uid is null then raise exception 'not signed in'; end if;
  if length(p_new) < 4 then raise exception 'passcode too short'; end if;
  select passcode_hash into existing from private.lockbin_secrets where user_id = uid;
  if existing is not null and (p_current is null or extensions.crypt(p_current, existing) <> existing) then
    raise exception 'current passcode is wrong';
  end if;
  insert into private.lockbin_secrets (user_id, passcode_hash)
    values (uid, extensions.crypt(p_new, extensions.gen_salt('bf', 10)))
    on conflict (user_id) do update set passcode_hash = excluded.passcode_hash, failed_attempts = 0, locked_until = null;
  delete from private.lockbin_sessions where user_id = uid;
end $$;

-- Opens the Lockbin for ten minutes. Five wrong attempts freeze it for fifteen.
create function public.unlock_lockbin(p_passcode text) returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); s private.lockbin_secrets; until timestamptz;
begin
  if uid is null then raise exception 'not signed in'; end if;
  select * into s from private.lockbin_secrets where user_id = uid for update;
  if not found then raise exception 'no passcode set'; end if;
  if s.locked_until is not null and s.locked_until > now() then raise exception 'too many attempts'; end if;

  if extensions.crypt(p_passcode, s.passcode_hash) <> s.passcode_hash then
    update private.lockbin_secrets
      set failed_attempts = failed_attempts + 1,
          locked_until = case when failed_attempts + 1 >= 5 then now() + interval '15 minutes' end
      where user_id = uid;
    return null;
  end if;

  update private.lockbin_secrets set failed_attempts = 0, locked_until = null where user_id = uid;
  until := now() + interval '10 minutes';
  insert into private.lockbin_sessions values (uid, until)
    on conflict (user_id) do update set unlocked_until = excluded.unlocked_until;
  return until;
end $$;

-- Slides the ten-minute window on activity; returns null if already locked.
create function public.touch_lockbin() returns timestamptz
language sql security definer set search_path = '' as $$
  update private.lockbin_sessions set unlocked_until = now() + interval '10 minutes'
  where user_id = auth.uid() and unlocked_until > now()
  returning unlocked_until
$$;

-- Called on tab blur and on explicit lock.
create function public.lock_lockbin() returns void
language sql security definer set search_path = '' as $$
  delete from private.lockbin_sessions where user_id = auth.uid()
$$;

-- Resolves an unlisted (or public) entry by share token. Private moments never leave the database.
create function public.get_shared_entry(p_token text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'entry', jsonb_build_object('id', e.id, 'date', e.entry_date, 'mood', e.mood, 'media_layout', e.media_layout),
    'diary', jsonb_build_object('handle', p.handle, 'owner_name', p.owner_name,
                                'dedication', coalesce(nullif(p.dedication, ''), p.owner_name)),
    'moments', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'time', m.occurred_at, 'body', m.body) order by m.occurred_at)
      from public.moments m where m.entry_id = e.id and m.visibility <> 'private'), '[]'),
    'media', coalesce((
      select jsonb_agg(to_jsonb(mi) - 'owner_id' order by mi.sort_order)
      from public.media_items mi left join public.moments m on m.id = mi.moment_id
      where mi.entry_id = e.id and (mi.moment_id is null or m.visibility <> 'private')), '[]'),
    'canvas', coalesce((
      select jsonb_agg(to_jsonb(c) - 'owner_id' order by c.z)
      from public.canvas_items c left join public.moments m on m.id = c.moment_id
      where c.entry_id = e.id and (c.moment_id is null or m.visibility <> 'private')), '[]'),
    'tracks', coalesce((
      select jsonb_agg(to_jsonb(t) - 'owner_id')
      from public.tracks t left join public.moments m on m.id = t.moment_id
      where t.entry_id = e.id and (t.moment_id is null or m.visibility <> 'private')), '[]')
  )
  from public.share_links s
  join public.entries e on e.id = s.entry_id
  join public.profiles p on p.id = e.owner_id
  where s.token = p_token
    and not e.in_lockbin
    and e.visibility <> 'private'
$$;

-- Counts a visit from anyone but the owner, on entries that are actually visible.
create function public.record_entry_view(p_entry_id uuid) returns void
language sql security definer set search_path = '' as $$
  insert into public.entry_views (entry_id, count)
  select e.id, 1 from public.entries e
  where e.id = p_entry_id and not e.in_lockbin and e.visibility <> 'private'
    and e.owner_id is distinct from auth.uid()
  on conflict (entry_id) do update set count = public.entry_views.count + 1
$$;

-- Private helpers are callable only from policies, not as API endpoints.
revoke all on function private.lockbin_open() from public;
revoke all on function private.can_read_content(uuid, uuid) from public;
revoke all on function private.can_write_entry(uuid) from public;
grant execute on function private.lockbin_open() to anon, authenticated;
grant execute on function private.can_read_content(uuid, uuid) to anon, authenticated;
grant execute on function private.can_write_entry(uuid) to anon, authenticated;

revoke all on function public.set_lockbin_passcode(text, text) from public, anon;
revoke all on function public.unlock_lockbin(text) from public, anon;
revoke all on function public.touch_lockbin() from public, anon;
revoke all on function public.lock_lockbin() from public, anon;
grant execute on function public.set_lockbin_passcode(text, text) to authenticated;
grant execute on function public.unlock_lockbin(text) to authenticated;
grant execute on function public.touch_lockbin() to authenticated;
grant execute on function public.lock_lockbin() to authenticated;
