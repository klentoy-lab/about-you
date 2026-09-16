import { moodGradient } from '../lib/moods.js'

/** The mood gradient as a spine. With no mood picked there's nothing to draw. */
export default function MoodSpine({ mood, horizontal = false, className = '' }) {
  const bg = moodGradient(mood, { horizontal })
  if (!bg) return null
  return <div aria-hidden className={className} style={{ background: bg }} />
}
