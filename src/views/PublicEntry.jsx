import { useMemo } from 'react'
import MediaGallery from '../components/MediaGallery.jsx'
import MoodSpine from '../components/MoodSpine.jsx'
import SongCard from '../components/SongCard.jsx'
import { ShareButton } from '../components/ShareSheet.jsx'
import FollowButton from '../components/FollowButton.jsx'
import { moodGlow } from '../lib/moods.js'
import { useMoodTheme } from '../lib/theme.js'
import { DedicationGutter, mediaSummary } from '../components/EntryList.jsx'
import { NotFound } from './PublicDiary.jsx'
import { formatTime, headline } from '../lib/date.js'
import { usePublicDiary } from '../lib/diaries.js'

/** One public entry, read-only, with neighbours for paging through the diary. */
export default function PublicEntry({ handle, date }) {
  const { diary, loading } = usePublicDiary(handle)
  const index = diary ? diary.entries.findIndex((e) => e.date === date) : -1
  useMoodTheme(index >= 0 ? diary.entries[index].mood : null)
  if (loading && !diary) {
    return (
      <main className="px-5 pt-20 md:px-12">
        <p className="type-meta text-vanilla/50">Opening the page…</p>
      </main>
    )
  }
  if (index < 0) return <NotFound />

  const entry = diary.entries[index]
  const newer = diary.entries[index - 1]
  const older = diary.entries[index + 1]
  const { weekday, dayMonth, year } = headline(entry.date)
  const moments = [...entry.moments].sort((a, b) => a.time.localeCompare(b.time))

  return (
    <main className="relative min-h-[calc(100svh-56px)]">
      <DedicationGutter name={diary.dedication} />

      <article className="relative px-5 pb-32 pt-10 md:ml-19 md:pl-14 md:pr-12 md:pt-14">
        <span
          aria-hidden
          className="pointer-events-none absolute right-0 top-0 h-[60vmin] w-[60vmin] rounded-full opacity-25 blur-[100px]"
          style={{ background: moodGlow(entry.mood) }}
        />

        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <a href={`#/d/${diary.handle}`} className="chip">
            ← To {diary.dedication}
          </a>
          <span className="flex flex-wrap gap-3">
          {!diary.mine && <FollowButton handle={diary.handle} name={diary.dedication} />}
          <ShareButton
            path={`d/${diary.handle}/${entry.date}`}
            name={diary.dedication}
            title={`${weekday[0] + weekday.slice(1).toLowerCase()}, ${dayMonth} ${year}`}
            label="Share this day"
          />
          </span>
        </div>

        <h1 className="relative mt-10" aria-label={`${weekday} ${dayMonth} ${year}`}>
          <span className="type-serif block text-[clamp(40px,5.5vw,80px)] text-vanilla/90">{weekday[0] + weekday.slice(1).toLowerCase()}</span>
          <span className="flex items-start gap-3">
            <span className="type-display text-[clamp(56px,8vw,120px)] text-vanilla">{dayMonth}</span>
            <span className="type-meta mt-[0.5em] text-vanilla/60">{year}</span>
          </span>
        </h1>
        {/* the day's mood sits under its date, not as a bar out in the gutter */}
        <MoodSpine mood={entry.mood} horizontal className="relative mt-6 h-1.25 w-full max-w-170 rounded-full" />

        {entry.track && (
          <div className="relative mt-14">
            <SongCard track={entry.track} />
          </div>
        )}

        <div className="mt-14 max-w-4xl">
          <ol className="max-w-170">
            {moments.map((m, i) => (
              <li key={m.id} className={i > 0 ? 'rule-hairline mt-14 pt-14' : ''}>
                <p className="type-meta mb-3 flex min-h-6.25 items-center text-vanilla/60">{formatTime(m.time)}</p>
                <p className="type-body whitespace-pre-line">{m.body}</p>
              </li>
            ))}
          </ol>

          {entry.media.length > 0 && (
            <section aria-label="Photos and video" className="rule-hairline mt-14 pt-6">
              <p className="type-meta flex min-h-9 items-center text-vanilla/50">{mediaSummary(entry.media)}</p>
              <div className="mt-6">
                <MediaGallery items={entry.media} layout={entry.mediaLayout} meta={`${dayMonth} ${year}`} />
              </div>
            </section>
          )}
        </div>

        <nav aria-label="More entries" className="type-meta rule-hairline mt-20 flex max-w-170 justify-between gap-6 pt-6">
          {older ? (
            <a href={`#/d/${diary.handle}/${older.date}`} className="text-mango hover:text-vanilla">
              ← {headline(older.date).dayMonth}
            </a>
          ) : (
            <span />
          )}
          {newer && (
            <a href={`#/d/${diary.handle}/${newer.date}`} className="text-mango hover:text-vanilla">
              {headline(newer.date).dayMonth} →
            </a>
          )}
        </nav>
      </article>
    </main>
  )
}
