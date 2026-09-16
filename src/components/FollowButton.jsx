import { follow, isFollowing, unfollow } from '../lib/store.js'
import { useStoreVersion } from '../lib/useStore.js'

/** Follow / Following toggle for someone else's diary. No counts, by design. */
export default function FollowButton({ handle, name, className = '' }) {
  useStoreVersion()
  const following = isFollowing(handle)
  return (
    <button
      type="button"
      aria-pressed={following}
      aria-label={following ? `Unfollow the diary to ${name}` : `Follow the diary to ${name}`}
      onClick={() => (following ? unfollow(handle) : follow(handle))}
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
