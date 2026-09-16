import { useMemo } from 'react'
import { DedicationGutter, EntryFull, MonthGroups } from '../components/EntryList.jsx'
import { dedicationOf, deleteEntry, getSettings, listEntries } from '../lib/store.js'
import { deleteFile } from '../lib/mediaStore.js'
import { useLockbin } from '../lib/lockbin.js'
import { useStoreVersion } from '../lib/useStore.js'
import { toDateKey } from '../lib/date.js'

/** Your whole diary, newest first. Lockbin days stay in the record as sealed placeholders. */
export default function Timeline() {
  const v = useStoreVersion()
  const unlocked = useLockbin()
  const entries = useMemo(() => listEntries(), [v])
  const dedication = dedicationOf(getSettings())

  // Deleting a day takes its photos and video with it.
  const removeDay = async (date) => {
    const entry = entries.find((e) => e.date === date)
    await Promise.all((entry?.media ?? []).map((m) => deleteFile(m.id).catch(() => {})))
    deleteEntry(date)
  }

  return (
    <main>
      <DedicationGutter name={dedication} />

      <div className="px-5 pb-32 pt-12 md:pl-[116px] md:pr-12 md:pt-16">
        <p className="type-meta text-vanilla/60">
          {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
        </p>
        <h1 className="type-display mt-4 text-[clamp(48px,8vw,120px)] text-vanilla">Timeline</h1>

        {entries.length === 0 ? (
          <p className="type-body mt-10">
            Nothing written yet.{' '}
            <a href="#/" className="text-mango hover:underline">
              Start with today.
            </a>
          </p>
        ) : (
          <div className="mt-12">
            <MonthGroups
              entries={entries}
              monthAction={(month) => (
                <a href={`#/print/month/${month}`} className="chip min-h-8 px-3" aria-label={`Export ${month} as PDF`}>
                  PDF
                </a>
              )}
              renderEntry={(e) => (
                <EntryFull
                  entry={e}
                  href={e.date === toDateKey() ? '#/' : `#/today/${e.date}`}
                  sealed={e.inLockbin && !unlocked}
                  unlockHref="#/lockbin"
                  showVisibility
                  onDelete={removeDay}
                />
              )}
            />
          </div>
        )}
      </div>
    </main>
  )
}
