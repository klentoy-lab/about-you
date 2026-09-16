import { MOODS } from '../lib/moods.js'

export default function MoodPicker({ value, onChange }) {
  return (
    <fieldset>
      <legend className="type-meta mb-3 text-vanilla/60">Mood</legend>
      <div className="flex items-end gap-2" role="radiogroup" aria-label="Mood">
        {MOODS.map((m) => {
          const selected = value === m.id
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={m.label}
              title={selected ? `${m.label} — click to clear` : m.label}
              onClick={() => onChange(selected ? null : m.id)}
              className="group flex flex-col items-center gap-2"
            >
              <span
                className={`block w-7 transition-[height] duration-700 ease-soft ${selected ? 'h-14' : 'h-9 group-hover:h-11'}`}
                style={{ background: m.gradient }}
              />
              <span
                aria-hidden
                className={`block h-[2px] w-full transition-colors duration-700 ${selected ? 'bg-mango' : 'bg-transparent'}`}
              />
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
