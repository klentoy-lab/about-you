import { ShareButton } from '../components/ShareSheet.jsx'
import { shortDate } from '../lib/date.js'
import { usePublicDiaries } from '../lib/diaries.js'
import { moodGlow, moodGradient } from '../lib/moods.js'
import { getSettings } from '../lib/store.js'
import { countLabel, useFollowCounts } from '../lib/social.js'

export default function Diaries() {
  const { diaries, loading, error } = usePublicDiaries()
  const settings = getSettings()
  const mineListed = diaries.some((d) => d.mine)
  const totalEntries = diaries.reduce((n, d) => n + d.count, 0)

  return (
    <main className="relative px-5 pb-32 pt-12 md:px-12 md:pt-16">
      <header className="max-w-240">
        <p className="type-meta text-vanilla/60">
          {diaries.length} {diaries.length === 1 ? 'diary' : 'diaries'} · {totalEntries} {totalEntries === 1 ? 'entry' : 'entries'} open to read
        </p>
        <h1 className="type-display mt-4 text-[clamp(56px,10vw,150px)] text-vanilla">Diaries</h1>
        <p className="type-serif mt-3 text-[clamp(26px,3.4vw,44px)] text-vanilla/85">Letters kept for someone — left open for you.</p>

        {!mineListed && (
          <p className="mt-8 flex flex-wrap items-center gap-4 text-[15px] text-vanilla/65">
            Your diary isn’t listed yet — it appears here once an entry is public.
            <a href={settings.handle ? '#/' : '#/settings'} className="chip">
              {settings.handle ? 'Write today →' : 'Set up your diary →'}
            </a>
          </p>
        )}
      </header>

      {loading && diaries.length === 0 && <p className="type-meta mt-14 text-vanilla/50">Looking for diaries…</p>}
      {error && <p className="type-meta mt-14 text-mango">Couldn’t reach the server — {error}</p>}
      {!loading && diaries.length === 0 && (
        <p className="type-body mt-14">No diaries are open to read yet. When someone makes an entry public, their diary appears here.</p>
      )}

      <ol className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8 xl:grid-cols-3">
        {diaries.map((d, i) => (
          <li key={d.handle} className="motion-safe:animate-[rise_900ms_cubic-bezier(0.22,1,0.36,1)_both]" style={{ animationDelay: `${Math.min(i, 8) * 90}ms` }}>
            <DiaryCover diary={d} />
          </li>
        ))}
      </ol>
    </main>
  )
}

function DiaryCover({ diary: d }) {
  const mood = d.latest?.mood
  const spine = moodGradient(mood)
  const excerpt = d.latest?.moments?.[0]?.body

  return (
    <article
      className="group relative flex min-h-104 flex-col overflow-hidden bg-raised pb-6 pl-10 pr-6 pt-6 transition-transform duration-700 ease-soft hover:-translate-y-1 hover:rotate-[-0.3deg] focus-within:-translate-y-1.5"
      style={{ borderRadius: '6px 18px 18px 6px' }}
    >
      {/* spine */}
      <span aria-hidden className="absolute inset-y-0 left-0 w-4.5" style={{ background: spine ?? 'var(--espresso-deep)' }} />
      <span aria-hidden className="absolute inset-y-0 left-4.5 w-px bg-ink/50" />
      {/* glow */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-35 blur-3xl transition-opacity duration-1000 ease-soft group-hover:opacity-70"
        style={{ background: moodGlow(mood) }}
      />

      {/* the whole cover opens the diary; the share button sits above this link */}
      <a href={`#/d/${d.handle}`} className="absolute inset-0 z-1" aria-label={`Open the diary to ${d.dedication}, by ${d.ownerName}`} />

      <div className="relative flex items-start justify-between gap-3">
        <p className="type-meta flex min-w-0 flex-wrap gap-x-2 pt-2 text-vanilla/80">
          <span className="whitespace-nowrap">{d.mine ? 'Yours' : 'Diary'} ·</span>
          <span className="whitespace-nowrap">
            {d.count === 0 ? 'nothing public yet' : `${d.count} public ${d.count === 1 ? 'entry' : 'entries'}`}
          </span>
        </p>
        <span className="relative z-2">
          <ShareButton
            path={`d/${d.handle}`}
            name={d.dedication}
            title={`A diary to ${d.dedication}, by ${d.ownerName}`}
            className="chip bg-ink/40 backdrop-blur"
          />
        </span>
      </div>

      <div className="relative mt-10">
        <p className="type-meta text-vanilla">To</p>
        <h2 className="type-display mt-2 wrap-break-word text-[clamp(44px,5.4vw,76px)] text-vanilla transition-colors duration-500 group-hover:text-mango">
          {d.dedication}
        </h2>
      </div>

      {excerpt ? (
        <p className="type-serif relative mt-6 line-clamp-3 text-[23px] leading-[1.2] text-vanilla/85">“{excerpt}”</p>
      ) : (
        d.mine && (
          <p className="type-serif relative mt-6 text-[23px] leading-[1.2] text-vanilla/70">
            Your days are private so far. Set one to public and it appears here for everyone.
          </p>
        )
      )}

      <p className="type-meta relative mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-8 text-vanilla/55">
        <span>By {d.ownerName}</span>
        <Followers ownerId={d.ownerId} />
        {d.firstDate && <span>Since {shortDate(d.firstDate)}</span>}
      </p>
    </article>
  )
}

function Followers({ ownerId }) {
  const counts = useFollowCounts(ownerId)
  return counts ? <span>{countLabel(counts.followers, 'follower', 'followers')}</span> : null
}
