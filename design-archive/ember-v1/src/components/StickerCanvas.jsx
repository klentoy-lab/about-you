import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import StickerArt from './StickerArt.jsx'
import { MAX_X, MIN_PX, topLimit } from '../lib/canvas.js'

// Canvas coordinates, shared by the editor and every read-only view:
//   x, w  — fractions of the canvas width (so a layout scales with the column)
//   y     — pixels from the canvas top (so stickers stay beside the text they were placed on)
//   x/y are the item's centre; rotation in degrees; z orders items among themselves.
// x may run past 1 — stickers are allowed to break out beyond the column's right edge.

const HOLD_MS = 700

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

function useWidth(ref) {
  const [w, setW] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setW(el.clientWidth))
    ro.observe(el)
    setW(el.clientWidth)
    return () => ro.disconnect()
  }, [ref])
  return w
}

/** Height the canvas needs so no sticker hangs below it. */
function canvasExtent(items, width) {
  return items.reduce((max, it) => {
    const w = it.w * width
    const h = w * it.aspect
    return Math.max(max, it.y + Math.hypot(w, h) / 2)
  }, 0)
}

/**
 * Wraps entry content. Children render normally; canvas items float above them.
 * Read-only unless `onChange` is given.
 */
export default function StickerCanvas({ items = [], onChange, selectedId, onSelect, children, className = '' }) {
  const ref = useRef(null)
  const width = useWidth(ref)
  const editable = Boolean(onChange)
  const [draft, setDraft] = useState(null) // live gesture: { id, patch }
  const [removed, setRemoved] = useState(null) // for Undo

  const view = items.map((it) => {
    const live = draft?.id === it.id ? { ...it, ...draft.patch } : it
    return width ? { ...live, y: Math.max(live.y, topLimit(live, width)) } : live
  })
  const minHeight = width ? canvasExtent(view, width) : 0

  // All changes are functional updates, so rapid key presses compose instead of overwriting each other.
  // `patch` may be an object or a function of the current item.
  const commit = (id, patch) =>
    onChange((list) => list.map((it) => (it.id === id ? { ...it, ...(typeof patch === 'function' ? patch(it) : patch) } : it)))

  const remove = (id) => {
    const item = items.find((it) => it.id === id)
    onChange((list) => list.filter((it) => it.id !== id))
    onSelect?.(null)
    setRemoved(item)
  }

  const restack = (id, toFront) =>
    onChange((list) => {
      const target = list.find((it) => it.id === id)
      if (!target) return list
      const ordered = [...list].sort((a, b) => a.z - b.z).filter((it) => it.id !== id)
      const next = toFront ? [...ordered, target] : [target, ...ordered]
      return list.map((it) => ({ ...it, z: next.findIndex((n) => n.id === it.id) }))
    })

  // Undo window for a removed sticker.
  useEffect(() => {
    if (!removed) return
    const t = setTimeout(() => setRemoved(null), 6000)
    return () => clearTimeout(t)
  }, [removed])

  // Clicking anywhere that isn't a sticker or its toolbar lets go of the selection.
  useEffect(() => {
    if (!editable || !selectedId) return
    const onDown = (e) => !e.target.closest?.('[data-canvas-keep]') && onSelect(null)
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [editable, selectedId, onSelect])

  const selected = view.find((it) => it.id === selectedId)

  return (
    <div ref={ref} className={`relative ${className}`} style={{ minHeight }}>
      {children}

      {/* The layer itself lets clicks through to the writing; only the items catch them. */}
      <div className="pointer-events-none absolute inset-0" style={{ zIndex: 20 }}>
        {width > 0 &&
          [...view]
            .sort((a, b) => a.z - b.z)
            .map((it) => (
              <CanvasItem
                key={it.id}
                item={it}
                width={width}
                canvasRef={ref}
                editable={editable}
                selected={it.id === selectedId}
                onSelect={() => onSelect?.(it.id)}
                onDraft={(patch) => setDraft(patch ? { id: it.id, patch } : null)}
                onCommit={(patch) => {
                  setDraft(null)
                  commit(it.id, patch)
                }}
                onRemove={() => remove(it.id)}
                onRestack={(front) => restack(it.id, front)}
              />
            ))}

        {editable && selected && width > 0 && (
          <Toolbar item={selected} width={width} onRestack={(front) => restack(selected.id, front)} onRemove={() => remove(selected.id)} />
        )}
      </div>

      {editable && removed && (
        <div role="status" className="type-meta fixed bottom-5 left-5 z-40 flex gap-5 bg-ink px-4 py-3 text-vanilla md:bottom-7 md:left-8">
          <span>{removed.kind === 'gif' ? 'GIF' : 'Sticker'} removed</span>
          <button
            type="button"
            onClick={() => {
              onChange((list) => [...list, removed])
              setRemoved(null)
            }}
            className="text-mango hover:text-vanilla"
          >
            Undo
          </button>
        </div>
      )}
    </div>
  )
}

function CanvasItem({ item, width, canvasRef, editable, selected, onSelect, onDraft, onCommit, onRemove, onRestack }) {
  const gesture = useRef(null)
  const [holding, setHolding] = useState(false)
  const w = Math.max(MIN_PX, item.w * width)
  const h = w * item.aspect

  const centre = () => {
    const r = canvasRef.current.getBoundingClientRect()
    return { cx: r.left + item.x * width, cy: r.top + item.y }
  }

  const begin = (mode) => (e) => {
    if (!editable || e.button > 0) return
    e.stopPropagation()
    e.preventDefault()
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* pen/touch edge cases — the gesture still works while the pointer stays over the item */
    }
    onSelect()
    const { cx, cy } = centre()
    gesture.current = {
      mode,
      px: e.clientX,
      py: e.clientY,
      start: { x: item.x, y: item.y, w: item.w, rotation: item.rotation },
      dist: Math.hypot(e.clientX - cx, e.clientY - cy) || 1,
      angle: Math.atan2(e.clientY - cy, e.clientX - cx),
      cx,
      cy,
      patch: null,
      moved: false,
      hold: null,
    }
    if (mode === 'drag') {
      setHolding(false)
      gesture.current.holdShow = setTimeout(() => setHolding(true), 180)
      gesture.current.hold = setTimeout(() => {
        gesture.current = null
        setHolding(false)
        onDraft(null)
        onRemove()
      }, HOLD_MS)
    }
  }

  const move = (e) => {
    const g = gesture.current
    if (!g) return
    const dx = e.clientX - g.px
    const dy = e.clientY - g.py
    if (!g.moved && Math.hypot(dx, dy) > 6) {
      g.moved = true
      clearTimeout(g.hold)
      clearTimeout(g.holdShow)
      setHolding(false)
    }
    if (!g.moved && g.mode === 'drag') return

    if (g.mode === 'drag') {
      g.patch = { x: clamp(g.start.x + dx / width, 0, MAX_X), y: Math.max(topLimit(item, width), g.start.y + dy) }
    } else if (g.mode === 'resize') {
      const scale = Math.hypot(e.clientX - g.cx, e.clientY - g.cy) / g.dist
      g.patch = { w: clamp(g.start.w * scale, MIN_PX / width, 1.2) }
    } else {
      let deg = g.start.rotation + ((Math.atan2(e.clientY - g.cy, e.clientX - g.cx) - g.angle) * 180) / Math.PI
      deg = ((((deg + 180) % 360) + 360) % 360) - 180
      if (e.shiftKey) deg = Math.round(deg / 15) * 15
      g.patch = { rotation: Math.round(deg * 10) / 10 }
    }
    onDraft(g.patch)
  }

  const end = () => {
    const g = gesture.current
    gesture.current = null
    setHolding(false)
    if (!g) return
    clearTimeout(g.hold)
    clearTimeout(g.holdShow)
    if (g.patch) onCommit(g.patch)
    else onDraft(null)
  }

  const onKeyDown = (e) => {
    const step = e.shiftKey ? 0.05 : 0.01
    const k = e.key
    let patch = null
    const turn = e.shiftKey ? 15 : 5
    if (k === 'ArrowLeft') patch = (it) => ({ x: clamp(it.x - step, 0, MAX_X) })
    else if (k === 'ArrowRight') patch = (it) => ({ x: clamp(it.x + step, 0, MAX_X) })
    else if (k === 'ArrowUp') patch = (it) => ({ y: Math.max(topLimit(it, width), it.y - step * width) })
    else if (k === 'ArrowDown') patch = (it) => ({ y: it.y + step * width })
    else if (k === '+' || k === '=') patch = (it) => ({ w: clamp(it.w * 1.08, MIN_PX / width, 1.2) })
    else if (k === '-' || k === '_') patch = (it) => ({ w: clamp(it.w / 1.08, MIN_PX / width, 1.2) })
    else if (k === ']' || k === '}') patch = (it) => ({ rotation: it.rotation + turn })
    else if (k === '[' || k === '{') patch = (it) => ({ rotation: it.rotation - turn })
    else if (k === 'Delete' || k === 'Backspace') return e.preventDefault(), onRemove()
    else if (k === 'PageUp') return e.preventDefault(), onRestack(true)
    else if (k === 'PageDown') return e.preventDefault(), onRestack(false)
    if (patch) {
      e.preventDefault()
      onCommit(patch)
    }
  }

  const label = `${item.kind === 'gif' ? 'GIF' : 'Sticker'}: ${item.title}`

  return (
    <div
      data-canvas-keep
      role={editable ? 'button' : 'img'}
      aria-label={editable ? `${label}. Drag to move. Arrow keys move, plus and minus resize, brackets rotate, Delete removes.` : label}
      aria-pressed={editable ? selected : undefined}
      tabIndex={editable ? 0 : undefined}
      onFocus={editable ? onSelect : undefined}
      onKeyDown={editable ? onKeyDown : undefined}
      onPointerDown={begin('drag')}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      onContextMenu={(e) => editable && e.preventDefault()}
      className={`absolute select-none ${editable ? 'pointer-events-auto touch-none cursor-grab active:cursor-grabbing' : ''} focus-visible:outline-none`}
      style={{
        left: item.x * width,
        top: item.y,
        width: w,
        height: h,
        transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
        zIndex: item.z + 1,
      }}
    >
      <div className="h-full w-full overflow-hidden" style={item.kind === 'gif' ? { borderRadius: 'var(--radius-media)' } : undefined}>
        <StickerArt item={item} />
      </div>

      {holding && (
        <span className="type-meta pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap bg-ink px-2 py-1 text-vanilla">
          Hold to remove
          <span className="mt-1 block h-[2px] origin-left animate-[hold_520ms_linear_forwards] bg-mango" />
        </span>
      )}

      {editable && selected && (
        <>
          <span aria-hidden className="pointer-events-none absolute -inset-1 outline outline-1 outline-mango" />
          {/* rotate: a stalk and a square handle above the item */}
          <span aria-hidden className="pointer-events-none absolute -top-7 left-1/2 h-6 w-px bg-mango" />
          <span
            data-canvas-keep
            onPointerDown={begin('rotate')}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
            title="Rotate (Shift snaps to 15°)"
            className="absolute -top-10 left-1/2 h-4 w-4 -translate-x-1/2 cursor-grab touch-none border-2 border-ink bg-mango"
          />
          {/* resize: bottom-right corner */}
          <span
            data-canvas-keep
            onPointerDown={begin('resize')}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
            title="Resize"
            className="absolute -bottom-2.5 -right-2.5 h-5 w-5 cursor-nwse-resize touch-none border-2 border-ink bg-mango"
          />
        </>
      )}
    </div>
  )
}

function Toolbar({ item, width, onRestack, onRemove }) {
  const w = Math.max(MIN_PX, item.w * width)
  const reach = Math.hypot(w, w * item.aspect) / 2
  return (
    <div
      data-canvas-keep
      className="type-meta pointer-events-auto absolute flex -translate-x-1/2 gap-4 whitespace-nowrap bg-ink px-3 py-2 text-vanilla"
      style={{ left: item.x * width, top: item.y + reach + 14, zIndex: 999 }}
    >
      <button type="button" onClick={() => onRestack(true)} className="text-mango hover:text-vanilla">
        Front
      </button>
      <button type="button" onClick={() => onRestack(false)} className="text-mango hover:text-vanilla">
        Back
      </button>
      <button type="button" onClick={onRemove} className="text-mango hover:text-vanilla">
        Remove
      </button>
    </div>
  )
}
