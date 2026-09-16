import { useState } from 'react'
import { SignInNeeded, toggleHeart, useHeart } from '../lib/social.js'

/** A heart for a public entry, with how many readers left one. Hidden until the count is known. */
export default function HeartButton({ entryId, size = 'md', className = '' }) {
  const { ready, count, hearted } = useHeart(entryId)
  const [note, setNote] = useState('')
  const [pop, setPop] = useState(0)
  if (!ready) return null

  const big = size === 'lg'
  return (
    <span className={`relative inline-flex items-center gap-3 ${className}`}>
      <button
        type="button"
        aria-pressed={hearted}
        aria-label={hearted ? `Take back your heart (${count})` : `Leave a heart (${count})`}
        onClick={async (e) => {
          e.preventDefault()
          e.stopPropagation()
          setNote('')
          try {
            await toggleHeart(entryId)
            setPop((n) => n + 1)
          } catch (err) {
            setNote(err instanceof SignInNeeded ? 'signin' : 'Couldn’t save your heart — try again')
          }
        }}
        className={`chip gap-2 ${big ? 'min-h-11 px-4' : 'min-h-8 px-3'} ${hearted ? 'border-mango text-mango' : ''}`}
      >
        <svg
          key={pop}
          viewBox="0 0 24 24"
          aria-hidden
          className={`${big ? 'h-5 w-5' : 'h-4 w-4'} ${pop ? 'motion-safe:animate-[soft-pop_420ms_ease-out]' : ''}`}
        >
          <path
            d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.7 3.8 4.5 7.1 4.5c2 0 3.5 1.1 4.9 2.9 1.4-1.8 2.9-2.9 4.9-2.9 3.3 0 5.5 3.2 4.3 6.6-1.7 4.8-9.2 9.4-9.2 9.4Z"
            fill={hearted ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
        <span className="tabular-nums">{count.toLocaleString('en-PH')}</span>
      </button>
      {note && (
        <span role="status" className="type-meta text-vanilla/70">
          {note === 'signin' ? (
            <a href="#/settings" onClick={(e) => e.stopPropagation()} className="text-mango underline-offset-4 hover:underline">
              Sign in to leave a heart →
            </a>
          ) : (
            note
          )}
        </span>
      )}
    </span>
  )
}
