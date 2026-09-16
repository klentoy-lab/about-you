import { useEffect, useId, useRef, useState } from 'react'
import { VISIBILITY } from '../lib/store.js'

const HINT = {
  private: 'Only you',
  unlisted: 'Anyone with the link',
  public: 'Listed on your diary',
}

/**
 * Small mono control. Opens a three-option menu rather than cycling on click,
 * so reaching PUBLIC always takes a deliberate second choice.
 */
export default function VisibilityToggle({ value, onChange, heldBy, label = 'Visibility' }) {
  const [open, setOpen] = useState(false)
  const root = useRef(null)
  const buttonRef = useRef(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    const onDown = (e) => root.current && !root.current.contains(e.target) && setOpen(false)
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    root.current?.querySelector('[aria-checked="true"]')?.focus()
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const onMenuKey = (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const items = [...root.current.querySelectorAll('[role="menuitemradio"]')]
    const i = items.indexOf(document.activeElement)
    const next = (i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
    items[next].focus()
  }

  return (
    <div ref={root} className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`${label}: ${value}`}
        onClick={() => setOpen((o) => !o)}
        className="type-meta flex items-center gap-2 py-1 text-mango hover:text-vanilla"
      >
        <Glyph state={value} />
        {value}
        {heldBy && (
          <span className="text-vanilla/50" title={`Held back by the entry, which is ${heldBy}`}>
            · held {heldBy}
          </span>
        )}
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKey}
          className="absolute left-0 top-full z-30 mt-2 min-w-[15rem] bg-ink py-2"
        >
          {VISIBILITY.map((v) => (
            <button
              key={v}
              type="button"
              role="menuitemradio"
              aria-checked={v === value}
              onClick={() => {
                onChange(v)
                setOpen(false)
                buttonRef.current?.focus()
              }}
              className={`type-meta flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-espresso ${
                v === value ? 'text-mango' : 'text-vanilla'
              }`}
            >
              <Glyph state={v} />
              <span className="flex-1">{v}</span>
              <span className="whitespace-nowrap text-vanilla/50 normal-case tracking-normal">{HINT[v]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Solid square = sealed, split = link-only, hollow = open. */
function Glyph({ state }) {
  const base = 'inline-block h-[7px] w-[7px] border border-current'
  if (state === 'private') return <span aria-hidden className={`${base} bg-current`} />
  if (state === 'unlisted')
    return (
      <span
        aria-hidden
        className={base}
        style={{ background: 'linear-gradient(135deg, currentColor 50%, transparent 50%)' }}
      />
    )
  return <span aria-hidden className={base} />
}
