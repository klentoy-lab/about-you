import { useCallback, useEffect, useRef, useState } from 'react'
import { ACCEPT, MediaError, addFile, filesFrom } from '../lib/mediaFiles.js'

/** Adds files one after another, reporting progress and per-file problems. */
export function useMediaUpload(onAdded) {
  const [progress, setProgress] = useState(null) // { done, total }
  const [errors, setErrors] = useState([])
  const onAddedRef = useRef(onAdded)
  onAddedRef.current = onAdded

  const add = useCallback(async (fileList) => {
    const files = filesFrom(fileList)
    if (!files.length) return
    setErrors([])
    setProgress({ done: 0, total: files.length })
    for (let i = 0; i < files.length; i++) {
      try {
        onAddedRef.current(await addFile(files[i]))
      } catch (e) {
        const why = e instanceof MediaError ? e.message : 'couldn’t be added'
        setErrors((errs) => [...errs, `${files[i].name} — ${why}`])
      }
      setProgress({ done: i + 1, total: files.length })
    }
    setProgress(null)
  }, [])

  return { add, progress, errors, dismissErrors: () => setErrors([]) }
}

/** "+ Photos & video" button with a hidden multi-file picker. */
export function AddMediaButton({ onFiles, disabled, children = '+ Photos & video' }) {
  const input = useRef(null)
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => input.current?.click()}
        className="type-meta py-1 text-mango hover:text-vanilla disabled:text-vanilla/40"
      >
        {children}
      </button>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        multiple
        hidden
        onChange={(e) => {
          onFiles(e.target.files)
          e.target.value = ''
        }}
      />
    </>
  )
}

/** Makes an element a drop target for files, showing a solid ink sheet while something is dragged over it. */
export function useFileDrop(ref, onFiles) {
  const [over, setOver] = useState(false)
  const depth = useRef(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const hasFiles = (e) => [...(e.dataTransfer?.types ?? [])].includes('Files')
    const enter = (e) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth.current++
      setOver(true)
    }
    const overFn = (e) => hasFiles(e) && e.preventDefault()
    const leave = (e) => {
      if (!hasFiles(e)) return
      depth.current = Math.max(0, depth.current - 1)
      if (depth.current === 0) setOver(false)
    }
    const drop = (e) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth.current = 0
      setOver(false)
      onFiles(e.dataTransfer.files)
    }
    el.addEventListener('dragenter', enter)
    el.addEventListener('dragover', overFn)
    el.addEventListener('dragleave', leave)
    el.addEventListener('drop', drop)
    return () => {
      el.removeEventListener('dragenter', enter)
      el.removeEventListener('dragover', overFn)
      el.removeEventListener('dragleave', leave)
      el.removeEventListener('drop', drop)
    }
  }, [ref, onFiles])

  return over
}

export function DropSheet({ show }) {
  if (!show) return null
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 bottom-0 top-[56px] z-30 flex items-center justify-center bg-ink/95">
      <p className="text-center">
        <span className="type-meta block text-vanilla/60">Photos & video</span>
        <span className="type-display mt-3 block text-[clamp(48px,8vw,120px)] text-vanilla">Drop to add</span>
      </p>
    </div>
  )
}

export function UploadStatus({ progress, errors, onDismiss }) {
  if (!progress && !errors.length) return null
  return (
    <div className="type-meta mt-4 space-y-1" role="status" aria-live="polite">
      {progress && (
        <p className="text-vanilla/60 tabular-nums">
          Adding {Math.min(progress.done + 1, progress.total)} of {progress.total}
        </p>
      )}
      {errors.map((err) => (
        <p key={err} className="normal-case tracking-normal text-mango">
          Couldn’t add {err}
        </p>
      ))}
      {!progress && errors.length > 0 && (
        <button type="button" onClick={onDismiss} className="text-vanilla/50 hover:text-mango">
          Dismiss
        </button>
      )}
    </div>
  )
}

/** Grid / Collage choice for an entry. */
export function LayoutToggle({ value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Media layout" className="type-meta flex gap-4">
      {['grid', 'collage'].map((opt) => (
        <button
          key={opt}
          type="button"
          role="radio"
          aria-checked={value === opt}
          onClick={() => onChange(opt)}
          className={`py-1 ${value === opt ? 'text-vanilla underline decoration-mango decoration-2 underline-offset-[6px]' : 'text-mango hover:text-vanilla'}`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}
