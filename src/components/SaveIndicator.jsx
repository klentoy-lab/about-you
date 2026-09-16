import { clockLabel } from '../lib/date.js'
import { useSession } from '../lib/auth.js'
import { useSync } from '../lib/sync.js'
import { cloudEnabled } from '../lib/supabase.js'

/** "Saved 9:12 AM · in your account" — where the writing went, not just that it went somewhere. */
export default function SaveIndicator({ status }) {
  const session = useSession()
  const sync = useSync()

  let text = ''
  if (status.state === 'pending') text = 'Saving'
  else if (status.at) text = `Saved ${clockLabel(status.at)}`

  let where = null
  if (text && cloudEnabled) {
    if (!session) where = 'this browser'
    else if (sync.phase === 'error') where = 'not on the server'
    else if (sync.phase === 'syncing' || sync.pending) where = 'saving to your account'
    else where = 'in your account'
  }

  return (
    <p
      role="status"
      aria-live="polite"
      className={`type-meta pointer-events-none fixed bottom-4 right-4 z-20 rounded-full border px-3 py-1.5 backdrop-blur-md transition-opacity duration-700 md:bottom-7 md:right-8 ${
        where === 'not on the server' ? 'border-wine/50 bg-wine/25 text-vanilla' : 'border-vanilla/10 bg-ink/70 text-vanilla/70'
      } ${text ? 'opacity-100' : 'opacity-0'}`}
    >
      {text}
      {where && <span className="text-vanilla/45"> · {where}</span>}
    </p>
  )
}
