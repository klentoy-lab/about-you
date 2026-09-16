import { useLayoutEffect, useRef, useState } from 'react'
import VisibilityToggle from './VisibilityToggle.jsx'
import { TZ_LABEL, formatTime, normaliseTime } from '../lib/date.js'

export default function Moment({ moment, heldBy, placeholder, autoFocus, onChange, onRemove }) {
  const area = useRef(null)
  const [timeDraft, setTimeDraft] = useState(() => formatTime(moment.time))
  const [confirmRemove, setConfirmRemove] = useState(false)

  useLayoutEffect(() => {
    const el = area.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [moment.body])

  useLayoutEffect(() => setTimeDraft(formatTime(moment.time)), [moment.time])

  const commitTime = () => {
    const t = normaliseTime(timeDraft)
    if (t && t !== moment.time) onChange({ time: t })
    else setTimeDraft(formatTime(moment.time))
  }

  return (
    <article className="group/moment">
      <header className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1">
        <label className="type-meta flex items-center">
          <span className="sr-only">Time of this moment, Philippine time</span>
          <input
            value={timeDraft}
            onChange={(e) => setTimeDraft(e.target.value)}
            onBlur={commitTime}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            maxLength={8}
            spellCheck={false}
            title={`Philippine time (${TZ_LABEL}) — type e.g. 7:30 PM`}
            className="w-[11.5ch] border-b border-dotted border-vanilla/30 bg-transparent py-1 text-vanilla hover:border-mango focus:border-mango focus:text-mango focus:outline-none focus-visible:outline-none"
          />
        </label>

        <VisibilityToggle
          value={moment.visibility}
          heldBy={heldBy}
          label="Moment visibility"
          onChange={(visibility) => onChange({ visibility })}
        />

        {onRemove && (
          <button
            type="button"
            onClick={() => (confirmRemove ? onRemove() : setConfirmRemove(true))}
            onBlur={() => setConfirmRemove(false)}
            className={`type-meta ml-auto py-1 ${
              confirmRemove ? 'text-mango' : 'text-vanilla/40 opacity-0 group-hover/moment:opacity-100 focus:opacity-100'
            } hover:text-mango`}
          >
            {confirmRemove ? 'Remove — sure?' : 'Remove'}
          </button>
        )}
      </header>

      <label className="block">
        <span className="sr-only">Write this moment</span>
        <textarea
          ref={area}
          value={moment.body}
          autoFocus={autoFocus}
          rows={1}
          placeholder={placeholder}
          onChange={(e) => onChange({ body: e.target.value })}
          className="type-body block w-full resize-none overflow-hidden bg-transparent placeholder:text-vanilla/35 focus:outline-none focus-visible:outline-none"
        />
      </label>
    </article>
  )
}
