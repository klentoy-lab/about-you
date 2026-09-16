// Sample diaries from other (fictional) people, so the Diaries directory has something in it
// while the shared backend isn't connected. Generated deterministically — same every load.
// Replace with a query against public entries once Supabase is wired in.

import { shiftDateKey, toDateKey } from './date.js'

const SAMPLES = [
  { handle: 'valerie', ownerName: 'Marco', dedication: 'Valerie', count: 360, every: 1, seed: 7 },
  { handle: 'lola_remedios', ownerName: 'Andrea', dedication: 'Lola Remedios', count: 48, every: 3, seed: 21 },
  { handle: 'paolo', ownerName: 'Bea', dedication: 'Paolo', count: 75, every: 2, seed: 42 },
  { handle: 'jun', ownerName: 'Jun', dedication: '', count: 120, every: 1, seed: 99 },
]

const LINES = [
  'The rain came in sideways on the way home and I stopped pretending the umbrella was helping.',
  'Had pandesal still warm from the bakery on the corner. Ate two before I got to the door.',
  'You would have laughed at the jeepney driver singing along to the radio, completely off-key.',
  'Long day. The kind where the coffee goes cold twice.',
  'Found the photo from the beach trip tucked inside a book I never finished.',
  'The mango tree outside finally has fruit. I counted eleven from the window.',
  'Traffic on EDSA gave me an hour to think about what I actually want to say to you.',
  'Made sinigang the way you taught me. Too sour. I ate all of it anyway.',
  'Walked past the place where we first talked. They painted it blue.',
  'Couldn’t sleep, so I sat on the balcony and listened to the tricycles go by.',
  'Brownout for three hours. Candles, a deck of cards, and the neighbours’ radio.',
  'Someone at work said my handwriting looks like yours. I didn’t correct them.',
  'The sky over the bay turned that orange you always stopped to take pictures of.',
  'Bought a plant. Named it after you. It is already leaning toward the window.',
  'Merienda was turon and too much gossip. A good afternoon.',
  'I keep writing “we” in my plans without noticing.',
  'The song came on shuffle and I had to pull over for a minute.',
  'Typhoon signal number two. School cancelled. The whole street went quiet.',
  'Fixed the squeaky gate finally. It feels like the house breathed out.',
  'Watched the sunrise from the rooftop. Nobody else was up. It felt like it was just for me.',
  'Tito called. Talked for an hour about nothing and it was exactly what I needed.',
  'Tried a new route to work and got lost in the best way.',
  'Cleaned out the drawer and found every ticket stub from last year.',
  'The halo-halo place reopened. Same lola behind the counter, same too-much leche flan.',
  'Wrote you a letter and didn’t send it. That’s what this is for, I think.',
  'Small win today. I’ll tell you about it properly later.',
  'Fireflies by the river again. I thought they were gone for good.',
  'Bad day. Not writing much. Just wanted the page to know I was here.',
  'Laughed so hard at dinner I had to leave the table.',
  'Rain on the tin roof all night. Best sleep in weeks.',
]

// mulberry32 — tiny seeded PRNG
function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pad = (n) => String(n).padStart(2, '0')

function buildDiary({ handle, ownerName, dedication, count, every, seed }) {
  const r = rng(seed)
  const pick = (arr) => arr[Math.floor(r() * arr.length)]
  const today = toDateKey()
  const entries = []

  for (let i = 0; i < count; i++) {
    const date = shiftDateKey(today, -i * every)
    const n = 1 + Math.floor(r() * 3)
    const times = Array.from({ length: n }, () => `${pad(6 + Math.floor(r() * 18))}:${pad(Math.floor(r() * 60))}`).sort()
    const moments = times.map((time, j) => ({
      id: `${handle}-${date}-${j}`,
      time,
      body: pick(LINES),
      // Roughly one moment in six stays private — it must never appear to visitors.
      visibility: r() < 0.16 ? 'private' : 'public',
    }))
    if (moments.every((m) => m.visibility === 'private')) moments[0].visibility = 'public'
    entries.push({
      id: `${handle}-${date}`,
      date,
      mood: 1 + Math.floor(r() * 5),
      visibility: 'public',
      inLockbin: false,
      moments,
    })
  }
  return { handle, ownerName, dedication, sample: true, entries }
}

let cache = null
export function sampleDiaries() {
  if (!cache) cache = SAMPLES.map(buildDiary)
  return cache
}
