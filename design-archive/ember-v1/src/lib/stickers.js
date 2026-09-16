// Ember's own sticker sheet: inline SVG in the brand palette, so it works offline and needs no key.
// Rendered inline (not as <img>) so lettered stickers pick up the page's Archivo and Plex Mono.

const C = {
  ink: '#100C08',
  mango: '#FF9F1C',
  amber: '#FF9408',
  ember: '#CA3F16',
  wine: '#95122C',
  vanilla: '#FFF1D6',
  mist: '#F3F4F5',
  fog: '#DBE0E1',
}
const DISPLAY = `font-family="Archivo, 'Arial Black', sans-serif" font-weight="700"`
const MONO = `font-family="'IBM Plex Mono', monospace"`

const sq = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">${body}</svg>`
const wide = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 120">${body}</svg>`

const rays = Array.from({ length: 12 }, (_, i) => {
  const a = (i * Math.PI) / 6
  const p = (r) => `${(100 + Math.cos(a) * r).toFixed(1)} ${(100 + Math.sin(a) * r).toFixed(1)}`
  return `<path d="M${p(62)} L${p(92)}" stroke="${C.amber}" stroke-width="12" stroke-linecap="round"/>`
}).join('')

const petals = Array.from({ length: 8 }, (_, i) =>
  `<ellipse cx="100" cy="52" rx="24" ry="40" fill="${C.vanilla}" stroke="${C.ink}" stroke-width="5" transform="rotate(${i * 45} 100 100)"/>`,
).join('')

export const STICKERS = [
  { id: 'sun', title: 'Sun', aspect: 1, svg: sq(`${rays}<circle cx="100" cy="100" r="52" fill="${C.mango}" stroke="${C.ink}" stroke-width="6"/>`) },
  {
    id: 'heart',
    title: 'Heart',
    aspect: 1,
    svg: sq(
      `<path d="M100 176 C40 132 16 100 16 66 C16 38 38 20 62 20 C80 20 94 30 100 46 C106 30 120 20 138 20 C162 20 184 38 184 66 C184 100 160 132 100 176Z" fill="${C.wine}" stroke="${C.ink}" stroke-width="6"/><path d="M50 58 C54 44 66 38 78 40" fill="none" stroke="${C.vanilla}" stroke-width="9" stroke-linecap="round"/>`,
    ),
  },
  {
    id: 'star',
    title: 'Star',
    aspect: 1,
    svg: sq(
      `<path d="M100 14 L124 74 L188 78 L138 118 L154 182 L100 146 L46 182 L62 118 L12 78 L76 74Z" fill="${C.amber}" stroke="${C.ink}" stroke-width="6" stroke-linejoin="round"/>`,
    ),
  },
  {
    id: 'sparkle',
    title: 'Sparkle',
    aspect: 1,
    svg: sq(
      `<path d="M100 8 C108 70 130 92 192 100 C130 108 108 130 100 192 C92 130 70 108 8 100 C70 92 92 70 100 8Z" fill="${C.vanilla}" stroke="${C.ink}" stroke-width="5"/><path d="M160 20 C163 38 168 43 186 46 C168 49 163 54 160 72 C157 54 152 49 134 46 C152 43 157 38 160 20Z" fill="${C.mango}"/>`,
    ),
  },
  {
    id: 'moon',
    title: 'Moon',
    aspect: 1,
    svg: sq(
      `<path d="M128 18 A84 84 0 1 0 182 138 A66 66 0 1 1 128 18Z" fill="${C.vanilla}" stroke="${C.ink}" stroke-width="6" stroke-linejoin="round"/><circle cx="66" cy="120" r="8" fill="${C.fog}"/><circle cx="92" cy="152" r="5" fill="${C.fog}"/>`,
    ),
  },
  {
    id: 'rain',
    title: 'Rain cloud',
    aspect: 1,
    svg: sq(
      `<path d="M52 118 C24 118 20 80 48 74 C50 44 92 34 106 58 C126 38 166 50 162 84 C188 88 186 118 160 118Z" fill="${C.mist}" stroke="${C.ink}" stroke-width="6" stroke-linejoin="round"/>${[60, 100, 140]
        .map((x, i) => `<path d="M${x} ${140 + (i % 2) * 10} q-8 18 0 26 q8 -8 0 -26Z" fill="${C.ember}"/>`)
        .join('')}`,
    ),
  },
  {
    id: 'mango',
    title: 'Mango',
    aspect: 1,
    svg: sq(
      `<path d="M150 40 C190 80 176 170 110 182 C50 192 18 140 40 96 C58 58 112 12 150 40Z" fill="${C.mango}" stroke="${C.ink}" stroke-width="6"/><path d="M150 40 C140 70 110 150 60 160" fill="none" stroke="${C.amber}" stroke-width="8" stroke-linecap="round" opacity=".7"/><path d="M146 42 C150 26 162 14 180 12 C176 30 164 40 146 42Z" fill="${C.wine}" stroke="${C.ink}" stroke-width="5"/>`,
    ),
  },
  {
    id: 'coffee',
    title: 'Coffee',
    aspect: 1,
    svg: sq(
      `<path d="M40 82 H144 V140 C144 166 124 180 92 180 C60 180 40 166 40 140Z" fill="${C.vanilla}" stroke="${C.ink}" stroke-width="6"/><path d="M144 98 C176 96 176 142 142 140" fill="none" stroke="${C.ink}" stroke-width="6"/><rect x="40" y="82" width="104" height="14" fill="${C.ember}"/><path d="M70 64 c-10 -14 10 -22 0 -40 M96 64 c-10 -14 10 -22 0 -40 M122 64 c-10 -14 10 -22 0 -40" fill="none" stroke="${C.fog}" stroke-width="6" stroke-linecap="round"/>`,
    ),
  },
  {
    id: 'flower',
    title: 'Flower',
    aspect: 1,
    svg: sq(`${petals}<circle cx="100" cy="100" r="26" fill="${C.mango}" stroke="${C.ink}" stroke-width="5"/>`),
  },
  {
    id: 'note',
    title: 'Music note',
    aspect: 1,
    svg: sq(
      `<path d="M74 150 V44 L166 24 V128" fill="none" stroke="${C.ink}" stroke-width="12" stroke-linejoin="round"/><ellipse cx="52" cy="152" rx="28" ry="22" fill="${C.mango}" stroke="${C.ink}" stroke-width="6"/><ellipse cx="144" cy="132" rx="28" ry="22" fill="${C.mango}" stroke="${C.ink}" stroke-width="6"/>`,
    ),
  },
  {
    id: 'plane',
    title: 'Paper plane',
    aspect: 1,
    svg: sq(
      `<path d="M14 96 L186 22 L136 176 L96 124Z" fill="${C.vanilla}" stroke="${C.ink}" stroke-width="6" stroke-linejoin="round"/><path d="M186 22 L96 124 L92 172 L118 140" fill="${C.fog}" stroke="${C.ink}" stroke-width="6" stroke-linejoin="round"/>`,
    ),
  },
  {
    id: 'camera',
    title: 'Camera',
    aspect: 1,
    svg: sq(
      `<path d="M24 64 H64 L78 44 H122 L136 64 H176 V164 H24Z" fill="${C.ink}"/><circle cx="100" cy="112" r="38" fill="${C.mist}"/><circle cx="100" cy="112" r="22" fill="${C.wine}"/><rect x="146" y="78" width="18" height="10" fill="${C.mango}"/>`,
    ),
  },
  {
    id: 'squiggle',
    title: 'Arrow',
    aspect: 1,
    svg: sq(
      `<path d="M22 150 C40 60 90 170 110 100 C124 52 150 64 170 40" fill="none" stroke="${C.mango}" stroke-width="12" stroke-linecap="round"/><path d="M142 32 L174 36 L166 68" fill="none" stroke="${C.mango}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>`,
    ),
  },
  {
    id: 'xo',
    title: 'XO',
    aspect: 1,
    svg: sq(
      `<circle cx="100" cy="100" r="86" fill="${C.wine}"/><text x="100" y="126" text-anchor="middle" font-size="80" letter-spacing="-4" fill="${C.vanilla}" ${DISPLAY}>XO</text>`,
    ),
  },
  {
    id: '143',
    title: '143',
    aspect: 1,
    svg: sq(
      `<rect x="16" y="46" width="168" height="108" fill="${C.mango}" stroke="${C.ink}" stroke-width="6"/><text x="100" y="122" text-anchor="middle" font-size="66" letter-spacing="-3" fill="${C.ink}" ${DISPLAY}>143</text><text x="100" y="146" text-anchor="middle" font-size="12" letter-spacing="3" fill="${C.ink}" ${MONO}>I LOVE YOU</text>`,
    ),
  },
  {
    id: 'salamat',
    title: 'Salamat',
    aspect: 1,
    svg: sq(
      `<circle cx="100" cy="100" r="88" fill="${C.ember}"/><circle cx="100" cy="100" r="74" fill="none" stroke="${C.vanilla}" stroke-width="3" stroke-dasharray="4 7"/><text x="100" y="112" text-anchor="middle" font-size="29" letter-spacing="-1" fill="${C.vanilla}" ${DISPLAY}>SALAMAT</text>`,
    ),
  },
  {
    id: 'today',
    title: 'Today stamp',
    aspect: 0.5,
    svg: wide(
      `<rect x="8" y="8" width="224" height="104" fill="none" stroke="${C.ember}" stroke-width="6"/><rect x="18" y="18" width="204" height="84" fill="none" stroke="${C.ember}" stroke-width="2"/><text x="120" y="82" text-anchor="middle" font-size="56" letter-spacing="-2" fill="${C.ember}" ${DISPLAY}>TODAY</text>`,
    ),
  },
  {
    id: 'ticket',
    title: 'Admit one',
    aspect: 0.5,
    svg: wide(
      `<path d="M8 12 H232 V46 A14 14 0 0 0 232 74 V108 H8 V74 A14 14 0 0 0 8 46Z" fill="${C.amber}" stroke="${C.ink}" stroke-width="5"/><path d="M178 16 V104" stroke="${C.ink}" stroke-width="3" stroke-dasharray="6 6"/><text x="92" y="68" text-anchor="middle" font-size="30" letter-spacing="-1" fill="${C.ink}" ${DISPLAY}>ADMIT ONE</text><text x="92" y="90" text-anchor="middle" font-size="11" letter-spacing="3" fill="${C.ink}" ${MONO}>Nº 0143</text>`,
    ),
  },
  {
    id: 'miss-you',
    title: 'Miss you',
    aspect: 0.5,
    svg: wide(
      `<rect x="10" y="24" width="220" height="72" fill="${C.vanilla}" stroke="${C.ink}" stroke-width="5" transform="rotate(-3 120 60)"/><text x="120" y="76" text-anchor="middle" font-size="44" letter-spacing="-2" fill="${C.wine}" ${DISPLAY} transform="rotate(-3 120 60)">MISS YOU</text>`,
    ),
  },
  {
    id: 'tape',
    title: 'Tape',
    aspect: 0.5,
    svg: wide(
      `<path d="M14 34 L226 22 L230 86 L18 98 L10 80 L20 66 L8 50Z" fill="${C.fog}" opacity=".85"/><path d="M30 44 L210 34" stroke="${C.mist}" stroke-width="4" opacity=".8"/>`,
    ),
  },
]

export const stickerById = Object.fromEntries(STICKERS.map((s) => [s.id, s]))
