import { useState } from 'react'
import { takenHandles } from '../lib/diaries.js'
import { getSettings, saveSettings, slugify } from '../lib/store.js'

/**
 * Your name, who the diary is for, and whether new entries start public.
 * `onboarding` shows just those three questions, full screen, on first open.
 */
export default function Settings({ onboarding = false, onDone }) {
  const initial = getSettings()
  const [ownerName, setOwnerName] = useState(initial.ownerName)
  const [dedication, setDedication] = useState(initial.dedication)
  const [defaultVisibility, setDefault] = useState(initial.defaultVisibility)
  const [handle, setHandle] = useState(initial.handle)
  const [savedNote, setSavedNote] = useState('')
  const [error, setError] = useState('')

  const taken = takenHandles()

  const submit = (e) => {
    e.preventDefault()
    if (!ownerName.trim()) return setError('Your name, please')
    let h = slugify(handle || dedication || ownerName)
    if (h.length < 2) h = `diary_${slugify(ownerName)}`.slice(0, 30)
    if (taken.includes(h)) {
      if (!onboarding) return setError(`/${h} is taken`)
      h = `${h}_${Math.floor(Math.random() * 900 + 100)}`.slice(0, 30)
    }
    saveSettings({ ownerName: ownerName.trim(), dedication: dedication.trim(), defaultVisibility, handle: h })
    setHandle(h)
    setError('')
    setSavedNote('Saved')
    onDone?.()
  }

  const field =
    'mt-3 block w-full border-b border-vanilla/30 bg-transparent pb-2 font-display text-[clamp(28px,4vw,48px)] font-bold uppercase leading-none tracking-[-0.03em] text-vanilla placeholder:text-vanilla/25 focus:border-mango focus:outline-none focus-visible:outline-none'

  const form = (
    <form onSubmit={submit} className="max-w-[48rem] space-y-12">
      <label className="type-meta block text-vanilla/60">
        {onboarding ? '01 · ' : ''}Your name
        <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className={field} placeholder="Marco" autoFocus={onboarding} />
      </label>

      <label className="type-meta block text-vanilla/60">
        {onboarding ? '02 · ' : ''}Who is this for
        <input value={dedication} onChange={(e) => setDedication(e.target.value)} className={field} placeholder={ownerName || 'Valerie'} />
        <span className="mt-2 block normal-case tracking-normal text-vanilla/45">Leave blank and it’s for you.</span>
      </label>

      <fieldset>
        <legend className="type-meta text-vanilla/60">{onboarding ? '03 · ' : ''}New entries start</legend>
        <div className="mt-4 flex gap-8">
          {['private', 'public'].map((opt) => (
            <label key={opt} className="type-meta flex cursor-pointer items-center gap-3 text-vanilla">
              <input
                type="radio"
                name="default-visibility"
                value={opt}
                checked={defaultVisibility === opt}
                onChange={() => setDefault(opt)}
                className="h-3 w-3 appearance-none border border-vanilla checked:border-mango checked:bg-mango"
              />
              <span className={defaultVisibility === opt ? 'text-mango' : ''}>{opt}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {!onboarding && (
        <label className="type-meta block text-vanilla/60">
          Diary address
          <span className="mt-3 flex items-baseline gap-1 border-b border-vanilla/30 pb-2 focus-within:border-mango">
            <span className="text-vanilla/50">ember/</span>
            <input
              value={handle}
              onChange={(e) => setHandle(slugify(e.target.value))}
              className="type-meta w-full bg-transparent text-[15px] text-vanilla focus:outline-none focus-visible:outline-none"
              placeholder={slugify(dedication || ownerName) || 'handle'}
            />
          </span>
        </label>
      )}

      {error && (
        <p role="alert" className="type-meta text-mango">
          {error}
        </p>
      )}

      <div className="type-meta flex items-center gap-6">
        <button type="submit" className="text-mango hover:text-vanilla">
          {onboarding ? 'Begin →' : 'Save'}
        </button>
        {!onboarding && savedNote && <span className="text-vanilla/50">{savedNote}</span>}
        {!onboarding && initial.handle && (
          <a href={`#/d/${initial.handle}`} className="text-mango hover:text-vanilla">
            View your public diary →
          </a>
        )}
      </div>
    </form>
  )

  if (onboarding) {
    return (
      <main className="min-h-[100svh] bg-espresso px-5 py-14 md:px-12 md:py-20">
        <p className="type-meta text-vanilla/60">Three things, then you can write</p>
        <h1 className="type-display mb-14 mt-4 text-[clamp(44px,7vw,104px)] text-vanilla">Start a diary</h1>
        {form}
      </main>
    )
  }

  return (
    <main className="px-5 pb-32 pt-12 md:px-12 md:pt-16">
      <h1 className="type-display mb-14 text-[clamp(48px,8vw,120px)] text-vanilla">Settings</h1>
      {form}
    </main>
  )
}
