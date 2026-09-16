// All clock and calendar values are Philippine time (Asia/Manila, UTC+8, no DST).
// Times are stored as 24-hour "HH:MM" so they sort; they are always displayed 12-hour.

export const TZ = 'Asia/Manila'
export const TZ_LABEL = 'PHT'

const DAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUNE', 'JULY', 'AUG', 'SEPT', 'OCT', 'NOV', 'DEC']
const MONTHS_LONG = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER']

const pad = (n) => String(n).padStart(2, '0')

const manilaParts = (d) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d)
  return Object.fromEntries(parts.map((p) => [p.type, p.value]))
}

/** The Manila calendar day as YYYY-MM-DD. */
export function toDateKey(d = new Date()) {
  const p = manilaParts(d)
  return `${p.year}-${p.month}-${p.day}`
}

/** A date key as a plain calendar date (no time zone meaning — only for day arithmetic). */
export function fromDateKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

export function shiftDateKey(key, days) {
  const d = fromDateKey(key)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** { weekday: 'TUESDAY', dayMonth: '15 SEPT', year: '2026' } */
export function headline(key) {
  const d = fromDateKey(key)
  return {
    weekday: DAYS[d.getUTCDay()],
    dayMonth: `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`,
    year: String(d.getUTCFullYear()),
  }
}

/** "15 SEPT 2026" */
export const shortDate = (key) => {
  const { dayMonth, year } = headline(key)
  return `${dayMonth} ${year}`
}

/** "SEPTEMBER 2026" from "2026-09-15" or "2026-09" */
export const monthLabel = (key) => {
  const [y, m] = key.split('-').map(Number)
  return `${MONTHS_LONG[m - 1]} ${y}`
}

/** Current Manila time as stored value, "19:08". */
export function nowTime(d = new Date()) {
  const p = manilaParts(d)
  return `${p.hour}:${p.minute}`
}

/** "19:08" → "7:08 PM" */
export function formatTime(hhmm) {
  if (!hhmm) return ''
  const [h, m] = hhmm.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${pad(m)} ${suffix}`
}

/** A real instant shown as Manila 12-hour time: "7:10 PM". */
export const clockLabel = (d = new Date()) => formatTime(nowTime(d))

/**
 * Reads what someone typed into a time field. Accepts "7:08 pm", "7.08p", "708pm",
 * "19:08", "1908". Returns stored "HH:MM" or null if it isn't a time.
 */
export function normaliseTime(input) {
  const raw = input.trim().toLowerCase()
  const meridiem = /p\.?m?\.?$/.test(raw) ? 'pm' : /a\.?m?\.?$/.test(raw) ? 'am' : null
  const body = raw.replace(/[ap]\.?m?\.?$/, '').trim()

  let h, m
  if (/[:.\s]/.test(body)) {
    const [a, b = '0'] = body.split(/[:.\s]+/)
    h = Number(a)
    m = Number(b)
  } else if (/^\d{3,4}$/.test(body)) {
    h = Number(body.slice(0, -2))
    m = Number(body.slice(-2))
  } else if (/^\d{1,2}$/.test(body)) {
    h = Number(body)
    m = 0
  } else {
    return null
  }
  if (!Number.isInteger(h) || !Number.isInteger(m) || m > 59) return null

  if (meridiem) {
    if (h < 1 || h > 12) return null
    if (meridiem === 'pm' && h !== 12) h += 12
    if (meridiem === 'am' && h === 12) h = 0
  } else if (h > 23) {
    return null
  }
  return `${pad(h)}:${pad(m)}`
}
