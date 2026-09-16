import { useSession } from '../lib/auth.js'
import { useSync } from '../lib/sync.js'
import { cloudEnabled } from '../lib/supabase.js'
import { readUnclaimed } from '../lib/store.js'
import { useStoreVersion } from '../lib/useStore.js'

/**
 * A quiet strip under the nav that answers "is my writing safe?".
 * Silent while signed in and synced; speaks up when a diary lives only in this browser.
 */
export default function CloudBanner() {
  const session = useSession()
  const sync = useSync()
  useStoreVersion()
  if (!cloudEnabled) return null
  const unclaimed = session && readUnclaimed()

  if (!session) {
    return (
      <Strip>
        <span className="text-vanilla">This diary is saved in this browser only.</span>
        <a href="#/settings" className="text-mango underline-offset-4 hover:underline">
          Sign in to keep it safe →
        </a>
      </Strip>
    )
  }
  if (unclaimed) {
    const n = unclaimed.entries?.length ?? 0
    return (
      <Strip>
        <span className="text-vanilla">
          {n} {n === 1 ? 'entry' : 'entries'} in this browser {n === 1 ? 'isn’t' : 'aren’t'} in your account.
        </span>
        <a href="#/settings" className="text-mango underline-offset-4 hover:underline">
          Choose what to do →
        </a>
      </Strip>
    )
  }
  if (sync.phase === 'error') {
    return (
      <Strip tone="error">
        <span className="text-vanilla">Couldn’t save to the server — {sync.error}</span>
        <a href="#/settings" className="text-mango underline-offset-4 hover:underline">
          Open settings →
        </a>
      </Strip>
    )
  }
  return null
}

function Strip({ children, tone }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : undefined}
      className={`type-meta sticky top-14 z-30 flex flex-wrap items-center gap-x-4 gap-y-1 border-b px-5 py-2 backdrop-blur-md md:px-8 ${
        tone === 'error' ? 'border-wine/40 bg-wine/20' : 'border-vanilla/10 bg-ink/70'
      }`}
    >
      {children}
    </div>
  )
}
