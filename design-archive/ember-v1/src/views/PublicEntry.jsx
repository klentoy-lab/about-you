import { useMemo } from 'react'
import MediaGallery from '../components/MediaGallery.jsx'
import MoodSpine from '../components/MoodSpine.jsx'
import StickerCanvas from '../components/StickerCanvas.jsx'
import { DedicationGutter, mediaSummary } from '../components/EntryList.jsx'
import { NotFound } from './PublicDiary.jsx'
import { formatTime, headline } from '../lib/date.js'
import { getPublicDiary } from '../lib/diaries.js'
import { useStoreVersion } from '../lib/useStore.js'

/** One public entry, read-only, with neighbours for paging through the diary. */
export default function PublicEntry({ handle, date }) {
  const v = useStoreVersion()
  const diary = useMemo(() => getPublicDiary(handle), [handle, v])
  const index = diary ? diary.entries.findIndex((e) => e.date === date) : -1
  if (index < 0) return <NotFound />

  const entry = diary.entries[index]
  const newer = diary.entries[index - 1]
  const older = diary.entries[index + 1]
  const { weekday, dayMonth, year } = headline(entry.date)
  const moments = [...entry.moments].sort((a, b) => a.time.localeCompare(b.time))

  return (
    <main className="relative min-h-[calc(100svh-56px)]">
      <DedicationGutter name={diary.dedication} />

      <article className="relative px-5 pb-32 pt-10 md:ml-[76px] md:pl-14 md:pr-12 md:pt-14">
        <MoodSpine mood={entry.mood} className="absolute inset-y-0 left-0 hidden w-[6px] md:block" />

        <a href={`#/d/${diary.handle}`} className="type-meta text-mango hover:text-vanilla">
          ← To {diary.dedication}
        </a>

        <h1 className="mt-10" aria-label={`${weekday} ${dayMonth} ${year}`}>
          <span className="type-display block text-[clamp(48px,7vw,104px)] text-vanilla">{weekday}</span>
          <span className="flex items-start gap-3">
            <span className="type-display text-[clamp(48px,7vw,104px)] text-vanilla">{dayMonth}</span>
            <span className="type-meta mt-[0.5em] text-vanilla/60">{year}</span>
          </span>
        </h1>
        <MoodSpine mood={entry.mood} horizontal className="mt-5 h-[4px] w-full md:hidden" />

        {/* Same spacing as the editor, so stickers sit where the author placed them. */}
        <StickerCanvas items={entry.canvas} className="mt-14 max-w-[56rem]">
          <ol className="max-w-[42.5rem]">
            {moments.map((m, i) => (
              <li key={m.id} className={i > 0 ? 'rule-hairline mt-14 pt-14' : ''}>
                <p className="type-meta mb-3 flex min-h-[25px] items-center text-vanilla/60">{formatTime(m.time)}</p>
                <p className="type-body whitespace-pre-line">{m.body}</p>
              </li>
            ))}
          </ol>

          {entry.media.length > 0 && (
            <section aria-label="Photos and video" className="rule-hairline mt-14 pt-6">
              <p className="type-meta flex min-h-[25px] items-center text-vanilla/50">{mediaSummary(entry.media)}</p>
              <div className="mt-6">
                <MediaGallery items={entry.media} layout={entry.mediaLayout} meta={`${dayMonth} ${year}`} />
              </div>
            </section>
          )}
        </StickerCanvas>

        <nav aria-label="More entries" className="type-meta rule-hairline mt-20 flex max-w-[42.5rem] justify-between gap-6 pt-6">
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
