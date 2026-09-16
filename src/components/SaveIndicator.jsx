import { clockLabel } from '../lib/date.js'

export default function SaveIndicator({ status }) {
  let text = ''
  if (status.state === 'pending') text = 'Saving'
  else if (status.at) text = `Saved ${clockLabel(status.at)}`

  return (
    <p
      role="status"
      aria-live="polite"
      className={`type-meta pointer-events-none fixed bottom-4 right-4 z-20 rounded-full border border-vanilla/10 bg-ink/70 px-3 py-1.5 text-vanilla/70 backdrop-blur-md transition-opacity duration-700 md:bottom-7 md:right-8 ${
        text ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {text}
    </p>
  )
}
