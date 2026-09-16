import { useState } from 'react'
import { isFollowing } from '../lib/store.js'
import { toggleFollow } from '../lib/social.js'
import { useStoreVersion } from '../lib/useStore.js'

/** Follow / Following toggle for someone else's diary. Saved to your account when signed in. */
export default function FollowButton({ handle, ownerId, name, className = '' }) {
  useStoreVersion()
  const following = isFollowing(handle)
  const [error, setError] = useState('')
  return (
    <button
      type="button"
      aria-pressed={following}
      aria-label={following ? `Unfollow the diary to ${name}` : `Follow the diary to ${name}`}
      title={error || undefined}
      onClick={() => {
        setError('')
        toggleFollow({ handle, ownerId }).catch(() => setError('Couldn’t reach the server — try again'))
      }}
      className={`chip group/follow ${following ? 'border-vanilla/30 text-vanilla' : ''} ${className}`}
    >
      {following ? (
        <>
          <span className="group-hover/follow:hidden">Following ✓</span>
          <span className="hidden group-hover/follow:inline">Unfollow</span>
        </>
      ) : (
        '+ Follow'
      )}
    </button>
  )
}
