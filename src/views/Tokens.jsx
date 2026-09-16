import Masthead from '../components/Masthead.jsx'
import { MOODS } from '../lib/moods.js'

const COLOURS = [
  ['espresso', '#2C1F14', 'Primary background — the whole app sits on this'],
  ['ink', '#100C08', 'Nav bar, overlays, lightbox, locked blocks'],
  ['mango', '#FF9F1C', 'Interactive only — active states, links'],
  ['amber', '#FF9408', 'Gradient start'],
  ['ember', '#CA3F16', 'Gradient mid'],
  ['wine', '#95122C', 'Gradient end'],
  ['vanilla', '#FFF1D6', 'Body text on dark, light panels'],
  ['mist', '#F3F4F5', 'Media frames, sticker tray'],
  ['fog', '#DBE0E1', 'Borders and dividers on light surfaces'],
]

export default function Tokens() {
  return (
    <main className="px-5 pb-32 pt-12 md:px-12 md:pt-16">
      <p className="type-meta text-vanilla/60">About You · design tokens</p>

      <Section title="Dedication masthead" meta="Mono label · display name fills the width">
        <Masthead as="h2" name="Valerie" />
      </Section>

      <Section title="Colour" meta="Dark by default · mango means clickable">
        <ul className="grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {COLOURS.map(([name, hex, use]) => (
            <li key={name} className="flex items-start gap-4">
              <span
                className={`block h-16 w-16 shrink-0 ${name === 'espresso' ? 'border border-vanilla/15' : ''}`}
                style={{ background: `var(--${name})` }}
              />
              <div>
                <p className="type-meta text-vanilla">--{name}</p>
                <p className="type-meta mt-1 text-vanilla/60">{hex}</p>
                <p className="mt-2 text-sm leading-snug text-vanilla/75">{use}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Mood" meta="Five gradients · the only place colour carries meaning">
        <ul className="flex flex-wrap gap-6">
          {MOODS.map((m) => (
            <li key={m.id} className="flex flex-col gap-3">
              <span className="block h-48 w-16" style={{ background: m.gradient }} />
              <span className="type-meta text-vanilla/70">--g0{m.id}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Surfaces" meta="No cards · no shadows · no uniform radius">
        <div className="grid gap-12 lg:grid-cols-2">
          <figure>
            <div className="bg-mist p-2" style={{ borderRadius: 'var(--radius-media)' }}>
              <div className="aspect-[4/3] w-full" style={{ background: 'var(--g03)', borderRadius: 'var(--radius-media)' }} />
            </div>
            <figcaption className="type-meta mt-3 text-vanilla/70">Media frame · mist · 2px max</figcaption>
          </figure>

          <figure>
            <div className="relative flex aspect-[4/3] flex-col justify-center gap-3 pl-6">
              <span className="absolute inset-y-0 left-0 w-[6px]" style={{ background: 'var(--g04)' }} />
              <p className="type-meta text-vanilla/60">Friday 11 Sept</p>
              <div className="h-20 bg-ink" />
              <p className="type-meta text-vanilla">In the Lockbin</p>
            </div>
            <figcaption className="type-meta mt-3 text-vanilla/70">Locked · solid ink, never blurred</figcaption>
          </figure>
        </div>

        <div className="mt-14 max-w-[68ch]">
          <p className="type-meta text-vanilla/60">2:32 PM</p>
          <p className="type-body mt-2">A moment.</p>
          <div className="rule-hairline mt-10 pt-10">
            <p className="type-meta text-vanilla/60">6:05 PM</p>
            <p className="type-body mt-2">The next one, below a hairline in fog at 15%.</p>
          </div>
        </div>
      </Section>
    </main>
  )
}

function Section({ title, meta, children }) {
  return (
    <section className="rule-hairline mt-20 pt-10">
      <div className="mb-10 flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="type-display text-[40px] text-vanilla">{title}</h2>
        <p className="type-meta text-vanilla/60">{meta}</p>
      </div>
      {children}
    </section>
  )
}
