import { useEffect, useMemo, useState } from 'react'
import FollowButton from '../components/FollowButton.jsx'
import { EntryLine } from '../components/EntryList.jsx'
import { useFollowingFeed } from '../lib/diaries.js'
import { getSettings, markFeedSeen } from '../lib/store.js'

const PAGE = 30

/**
 * New public entries from the diaries you follow, newest first.
 * A feed, not a social network: hearts and follower numbers, but no comments.
 */
export default function Following() {
  const [limit, setLimit] = useState(PAGE)
  // "New" is measured from the previous visit, frozen when the page opens; this visit is recorded on leaving.
  const [seenAt] = useState(() => getSettings().feedSeenAt)
  const feed = useFollowingFeed({ limit, seenAt })

  useEffect(() => () => markFeedSeen(), [])

  const newCount = feed.items.filter((i) => i.isNew).length

  return (
    <main className="px-5 pb-32 pt-12 md:px-12 md:pt-16">
      <header className="max-w-240">
        <p className="type-meta text-vanilla/60">
          {feed.diaries.length} {feed.diaries.length === 1 ? 'diary' : 'diaries'} followed
          {newCount > 0 && ` · ${newCount} new since your last visit`}
        </p>
        <h1 className="type-display mt-4 text-[clamp(56px,10vw,150px)] text-vanilla">Following</h1>
        <p className="type-serif mt-3 text-[clamp(26px,3.4vw,44px)] text-vanilla/85">New pages from the diaries you keep up with.</p>
      </header>

      {feed.diaries.length === 0 ? (
        <div className="mt-12 max-w-2xl">
          <p className="type-body">You’re not following any diaries yet. Open one and press Follow — its new public entries will gather here.</p>
          <a href="#/diaries" className="chip chip-solid mt-6">
            Browse diaries →
          </a>
        </div>
      ) : (
        <>
          {/* who you follow */}
          <ul className="mt-10 flex flex-wrap gap-3" aria-label="Diaries you follow">
            {feed.diaries.map((d) => (
              <li key={d.handle} className="flex items-center gap-2 rounded-full border border-vanilla/10 bg-raised/60 py-1 pl-4 pr-1">
                <a href={`#/d/${d.handle}`} className="type-meta whitespace-nowrap text-vanilla transition-colors hover:text-mango">
                  To {d.dedication}
                </a>
                <FollowButton handle={d.handle} ownerId={d.ownerId} name={d.dedication} className="min-h-8 px-3" />
              </li>
            ))}
          </ul>

          <ol className="mt-12 max-w-5xl space-y-4 md:space-y-5">
            {feed.items.map(({ diary, entry, isNew }) => (
              <li key={`${diary.handle}-${entry.date}`}>
                <EntryLine
                  entry={entry}
                  href={`#/d/${diary.handle}/${entry.date}`}
                  hearts
                  kicker={
                    <p className="type-meta flex flex-wrap items-center gap-x-3 gap-y-1 text-vanilla/60">
                      <span className="text-vanilla">To {diary.dedication}</span>
                      <span>by {diary.ownerName}</span>
                      {isNew && <span className="rounded-full bg-mango px-2 py-0.5 text-ink">New</span>}
                    </p>
                  }
                />
              </li>
            ))}
          </ol>

          {feed.total > feed.items.length ? (
            <button type="button" onClick={() => setLimit((l) => l + PAGE)} className="chip mt-10">
              Show more
            </button>
          ) : (
            <p className="type-meta mt-10 text-vanilla/45">You’re all caught up.</p>
          )}
        </>
      )}
    </main>
  )
}
