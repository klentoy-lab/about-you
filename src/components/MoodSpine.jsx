import { moodGradient } from '../lib/moods.js'

/** The mood gradient as a spine. With no mood picked it stays hollow. */
export default function MoodSpine({ mood, horizontal = false, className = '' }) {
  const bg = moodGradient(mood, { horizontal })
  return (
    <div
      aria-hidden
      className={`${className} ${bg ? '' : 'border border-vanilla/15'}`}
      style={bg ? { background: bg } : undefined}
    />
  )
}
