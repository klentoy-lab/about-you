import { useEffect, useMemo, useRef, useState } from 'react'
import Masthead from '../components/Masthead.jsx'
import { DedicationGutter, EntryLine, MonthGroups } from '../components/EntryList.jsx'
import { ShareButton } from '../components/ShareSheet.jsx'
import FollowButton from '../components/FollowButton.jsx'
import { shortDate } from '../lib/date.js'
import { moodGlow } from '../lib/moods.js'
import { useMoodTheme } from '../lib/theme.js'
import { usePublicDiary } from '../lib/diaries.js'

/** A diary as anyone sees it: the dedication first, then every public entry. Read-only. */
export default function PublicDiary({ handle }) {
  const { diary, loading } = usePublicDiary(handle)
  // The first screen is the masthead alone; the side dedication arrives once it has scrolled away.
  const header = useRef(null)
  const [pastMasthead, setPastMasthead] = useState(false)
  useMoodTheme(diary?.latest?.mood) // someone else's diary wears its latest mood

  useEffect(() => {
    if (!header.current) return
    // Only once the masthead has fully gone under the nav, so the two names never overlap.
    const io = new IntersectionObserver(([e]) => setPastMasthead(!e.isIntersecting), { rootMargin: '-56px 0px 0px 0px' })
    io.observe(header.current)
    return () => io.disconnect()
  }, [diary])

  if (loading && !diary) {
    return (
      <main className="px-5 pt-20 md:px-12">
        <p className="type-meta text-vanilla/50">Opening the diary…</p>
      </main>
    )
  }
  if (!diary || diary.count === 0) return <NotFound />

  return (
    <main>
      <header ref={header} className="relative flex flex-col justify-end overflow-hidden px-5 pb-10 pt-12 md:min-h-[60svh] md:px-12 md:pb-16 md:pt-20">
        {/* the latest mood glows behind the name */}
        <span
          aria-hidden
          className="pointer-events-none absolute -left-[10%] bottom-[-20%] h-[80vmin] w-[80vmin] rounded-full opacity-40 blur-[110px] motion-safe:animate-[drift_24s_ease-in-out_infinite]"
          style={{ background: moodGlow(diary.latest?.mood) }}
        />
        <div className="relative">
          <Masthead
            name={diary.dedication}
            byline={`from ${diary.ownerName}, one day at a time`}
            meta={`${diary.count} ${diary.count === 1 ? 'entry' : 'entries'} · First entry ${shortDate(diary.firstDate)}`}
            actions={
              <>
                <ShareButton
                  path={`d/${diary.handle}`}
                  name={diary.dedication}
                  title={`A diary to ${diary.dedication}, by ${diary.ownerName}`}
                  className="chip chip-solid"
                  label="Share this diary"
                />
                {!diary.mine && <FollowButton handle={diary.handle} name={diary.dedication} />}
                <a
                  href="#entries"
                  className="chip"
                  onClick={(e) => (e.preventDefault(), document.getElementById('entries')?.scrollIntoView({ behavior: 'smooth' }))}
                >
                  Read ↓
                </a>
              </>
            }
          />
        </div>
      </header>

      <DedicationGutter name={diary.dedication} visible={pastMasthead} />

      <div id="entries" className="scroll-mt-14 px-5 pb-32 md:pl-[116px] md:pr-12">
        <p className="type-meta rule-hairline py-6 text-vanilla/60">
          By {diary.ownerName}
          {diary.mine && ' · This is how visitors see your diary'}
        </p>
        <MonthGroups
          entries={diary.entries}
          renderEntry={(e) => <EntryLine entry={e} href={`#/d/${diary.handle}/${e.date}`} />}
        />
      </div>
    </main>
  )
}

export function NotFound() {
  return (
    <main className="px-5 pb-32 pt-16 md:px-12">
      <h1 className="type-display text-[clamp(44px,7vw,96px)] text-vanilla">Nothing here</h1>
      <p className="type-body mt-6">This diary doesn’t exist, or nothing in it is public.</p>
      <a href="#/diaries" className="chip mt-8">
        ← All diaries
      </a>
    </main>
  )
}
