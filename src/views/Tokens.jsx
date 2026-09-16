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
      <p className="type-meta text-vanilla/60">About You · design tokens v2</p>
      <h1 className="type-display mt-4 max-w-[12ch] text-[clamp(48px,8vw,120px)] text-vanilla">The ground rules</h1>
      <p className="type-serif mt-4 max-w-[36ch] text-[clamp(26px,3vw,40px)] text-vanilla/85">
        Same palette, warmer voice. The v1 “Ember” design is archived in design-archive/ember-v1.
      </p>

      <Section title="What v2 adds" meta="Serif voice · glow · grain · pills">
        <div className="grid gap-10 lg:grid-cols-3">
          <div>
            <p className="type-meta text-vanilla/60">Serif accent — Instrument Serif italic</p>
            <p className="type-serif mt-3 text-[44px] text-vanilla">a note with the song</p>
            <p className="mt-3 text-sm text-vanilla/70">Dedications, taglines, weekdays, excerpts. Never for body writing.</p>
          </div>
          <div>
            <p className="type-meta text-vanilla/60">Actions — pill chips</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <span className="chip chip-solid">+ Moment</span>
              <span className="chip">+ Photos & video</span>
              <span className="chip">♪ Song of the day</span>
            </div>
            <p className="mt-3 text-sm text-vanilla/70">Solid for the main action in a group, outline for the rest.</p>
          </div>
          <div>
            <p className="type-meta text-vanilla/60">Glow & raised surfaces</p>
            <div className="relative mt-4 h-28 overflow-hidden bg-raised" style={{ borderRadius: 'var(--radius-card)' }}>
              <span className="absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-60 blur-3xl" style={{ background: '#CA3F16' }} />
            </div>
            <p className="mt-3 text-sm text-vanilla/70">Each mood glows one colour behind covers, mastheads and Today.</p>
          </div>
        </div>
      </Section>

      <Section title="Dedication masthead" meta="Mono label · display name fills the width">
        <Masthead as="h2" name="Valerie" meta="360 entries · First entry 21 Sept 2025" />
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

      <Section title="Type" meta="Three roles · two families">
        <div className="space-y-14">
          <Specimen role="Display" spec="Archivo 700 · uppercase · −0.03em · 0.92">
            <p className="type-display text-[clamp(48px,7vw,96px)] text-vanilla">
              Wednesday
              <br />
              15 Sept
            </p>
          </Specimen>
          <Specimen role="Body" spec="Inter 400 · 18/1.65 · 68ch · vanilla 90%">
            <p className="type-body">
              The rain stopped just before six and the whole street smelled like hot stone. I walked the long way home so the
              song could finish, and then played it again at the door.
            </p>
          </Specimen>
          <Specimen role="Meta" spec="IBM Plex Mono 400 · 11px · uppercase · 0.22em">
            <p className="type-meta flex flex-wrap gap-x-8 gap-y-2 text-vanilla">
              <span>2:32 PM</span>
              <span>Saved 2:32 PM</span>
              <span>In the Lockbin</span>
              <span className="text-mango">Private</span>
            </p>
          </Specimen>
        </div>
      </Section>

      <Section title="Surfaces" meta="No cards · no shadows · no uniform radius">
        <div className="grid gap-12 lg:grid-cols-3">
          <figure>
            <div className="bg-mist p-2" style={{ borderRadius: 'var(--radius-media)' }}>
              <div className="aspect-[4/3] w-full" style={{ background: 'var(--g03)', borderRadius: 'var(--radius-media)' }} />
            </div>
            <figcaption className="type-meta mt-3 text-vanilla/70">Media frame · mist · 2px max</figcaption>
          </figure>

          <figure>
            <div className="flex aspect-[4/3] flex-col justify-end">
              <div className="bg-mist px-5 pb-6 pt-4" style={{ borderRadius: 'var(--radius-tray) var(--radius-tray) 0 0' }}>
                <div className="mx-auto mb-4 h-1 w-10 bg-fog" />
                <p className="type-meta flex gap-6 text-ink">
                  <span className="border-b-2 border-ink pb-1">Stickers</span>
                  <span className="text-ink/60">GIFs</span>
                  <span className="text-ink/60">Recent</span>
                </p>
              </div>
            </div>
            <figcaption className="type-meta mt-3 text-vanilla/70">Sticker tray · 20px top corners only</figcaption>
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

function Specimen({ role, spec, children }) {
  return (
    <div className="grid gap-4 md:grid-cols-[220px_1fr]">
      <div>
        <p className="type-meta text-vanilla">{role}</p>
        <p className="type-meta mt-2 leading-relaxed text-vanilla/55">{spec}</p>
      </div>
      <div>{children}</div>
    </div>
  )
}
