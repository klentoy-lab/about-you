# About You

A digital diary. Every day is a page: write as many moments as you like, give the day a mood,
add photos and video, and attach the song you had on repeat. A diary is kept for someone, and that
dedication is the first thing anyone sees.

Live: https://aboutyou-diary.web.app

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

Environment variables (`.env.local` locally, `.github/workflows/firebase-hosting-*.yml` in production):

| Variable | What it is |
| --- | --- |
| `VITE_SUPABASE_URL` | Project URL, from Project Settings → API |
| `VITE_SUPABASE_ANON_KEY` | The publishable (anon) key — safe in a browser |

Never put the `service_role` or secret key in this app: it bypasses row-level security.

## Deploying

Firebase Hosting (project `aboutyou-diary`). GitHub Actions builds and deploys on every push to `main`
(`.github/workflows/firebase-hosting-merge.yml`); pull requests get a temporary preview link.
`firebase.json` sets the hosting rules. To deploy by hand: `npm run build` with the variables set,
then `npx firebase-tools deploy --only hosting`.

After changing the site address, add it in Supabase → Authentication → URL Configuration
(Site URL and Redirect URLs), or sign-in will return people to the old address.

## Design

`design-archive/ember-v1` keeps the original "Ember" design as a runnable copy, from before the
rename and the visual refresh.
