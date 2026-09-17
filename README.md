# About You

A digital diary. Every day is a page: write as many moments as you like, give the day a mood,
add photos and video, and attach the song you had on repeat. A diary is kept for someone, and that
dedication is the first thing anyone sees.

Live: https://about-you.klentdagsa21.workers.dev

## What's in it

- **Today** — the writing surface. Autosaves, timestamps in Philippine time, backdating, per-moment
  privacy (private / unlisted / public).
- **Mood** — five gradients. The chosen one re-themes the whole app and marks the day everywhere.
- **Photos & video** — drag and drop, grid or taped-in collage, captions, full-screen viewer.
- **Song of the day** — paste a Spotify link; the card shows the artwork, your note, and a player.
- **Timeline, Calendar, Media wall, Search** — ways back through what you've written.
- **Lockbin** — a passcode on top of your account. Sealed days vanish from every public page and
  leave only a sealed placeholder in your own timeline.
- **Public diaries** — share a diary at `#/d/handle`, with a QR code and link. Follow others and
  read new entries in a simple feed. No likes, no comments, no counters.
- **PDF export** — one day or a whole month, keeping the layout.

## Running it

```bash
npm install
cp .env.example .env.local   # fill in the Supabase values
npm run dev
```

## Backend

Supabase provides accounts, storage and Postgres. `supabase/migrations/0001_init.sql` creates every
table and the row-level security that enforces privacy on the server: a private entry is never in the
response at all. Run it once in the Supabase SQL editor.

Environment variables (`.env.local` locally, Cloudflare → the Worker → Settings → Build → Variables and secrets in production):

| Variable | What it is |
| --- | --- |
| `VITE_SUPABASE_URL` | Project URL, from Project Settings → API |
| `VITE_SUPABASE_ANON_KEY` | The publishable (anon) key — safe in a browser |

Never put the `service_role` or secret key in this app: it bypasses row-level security.

## Deploying

Cloudflare Workers builds from this repository on every push to `main`: build command `npm run build`,
static assets from `dist`. `public/_headers` sets long caching for the fingerprinted `/assets` files.
The app routes with `#/…` hashes, so no rewrite rules are needed.

## Design

`design-archive/ember-v1` keeps the original "Ember" design as a runnable copy, from before the
rename and the visual refresh.
