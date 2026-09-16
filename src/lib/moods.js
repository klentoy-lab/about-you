// Five moods, in the brief's order. The gradient is the meaning; the number is just an index.
export const MOODS = [1, 2, 3, 4, 5].map((n) => ({
  id: n,
  label: `Mood 0${n}`,
  gradient: `var(--g0${n})`,
}))

/** v2: the single colour each mood glows with behind covers, mastheads and the Today page. */
export const MOOD_GLOW = { 1: '#FF9408', 2: '#CA3F16', 3: '#E0561A', 4: '#95122C', 5: '#95122C' }
export const moodGlow = (mood) => MOOD_GLOW[mood] ?? '#FF9408'

/** Vertical by default; `horizontal` for the mobile bar under the date. */
export const moodGradient = (mood, { horizontal = false } = {}) => {
  if (!mood) return null
  return horizontal ? `linear-gradient(90deg, var(--g0${mood}-stops))` : `var(--g0${mood})`
}
