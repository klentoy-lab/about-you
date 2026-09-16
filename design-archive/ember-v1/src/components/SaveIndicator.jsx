import { clockLabel } from '../lib/date.js'

export default function SaveIndicator({ status }) {
  let text = ''
  if (status.state === 'pending') text = 'Saving'
  else if (status.at) text = `Saved ${clockLabel(status.at)}`

  return (
    <p
      role="status"
      aria-live="polite"
      className="type-meta pointer-events-none fixed bottom-5 right-5 z-20 text-vanilla/55 md:bottom-7 md:right-8"
    >
      {text}
    </p>
  )
}
