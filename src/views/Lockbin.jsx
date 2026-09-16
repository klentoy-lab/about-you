import { useMemo, useState } from 'react'
import { EntryFull } from '../components/EntryList.jsx'
import { LockbinError, hasPasscode, lock, setPasscode, unlock, useLockbin } from '../lib/lockbin.js'
import { listEntries, setInLockbin } from '../lib/store.js'
import { useStoreVersion } from '../lib/useStore.js'

export default function Lockbin() {
  const unlocked = useLockbin()
  const v = useStoreVersion()
  const entries = useMemo(() => listEntries().filter((e) => e.inLockbin), [v])

  return (
    <main className="px-5 pb-32 pt-12 md:px-12 md:pt-16">
      <p className="type-meta text-vanilla/60">
        {entries.length} sealed {entries.length === 1 ? 'entry' : 'entries'}
      </p>
      <h1 className="type-display mt-4 text-[clamp(48px,8vw,120px)] text-vanilla">Lockbin</h1>

      {!hasPasscode() ? <SetPasscode /> : !unlocked ? <Unlock /> : <Open entries={entries} />}
    </main>
  )
}

const inputCls =
  'type-meta mt-2 block w-full max-w-[18rem] border-b border-vanilla/30 bg-transparent py-2 text-[18px] tracking-[0.4em] text-vanilla focus:border-mango focus:outline-none focus-visible:outline-none'

function SetPasscode() {
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (a.length < 4) return setError('At least 4 characters')
    if (a !== b) return setError('Passcodes don’t match')
    await setPasscode(a)
  }

  return (
    <form onSubmit={submit} className="mt-10 max-w-[42.5rem] space-y-8">
      <p className="type-body">Choose a passcode. It seals the Lockbin on top of your account — anything you move in here disappears from every public page.</p>
      <label className="type-meta block text-vanilla/60">
        Passcode
        <input type="password" autoComplete="new-password" value={a} onChange={(e) => setA(e.target.value)} className={inputCls} autoFocus />
      </label>
      <label className="type-meta block text-vanilla/60">
        Again
        <input type="password" autoComplete="new-password" value={b} onChange={(e) => setB(e.target.value)} className={inputCls} />
      </label>
      {error && <p className="type-meta text-mango">{error}</p>}
      <button type="submit" className="type-meta text-mango hover:text-vanilla">
        Seal the Lockbin →
      </button>
    </form>
  )
}


function Unlock() {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      if (await unlock(code)) return
      setError('Wrong passcode')
    } catch (err) {
      setError(err instanceof LockbinError ? err.message : 'Couldn’t check the passcode')
    } finally {
      setBusy(false)
    }
    setCode('')
  }

  return (
    <form onSubmit={submit} className="mt-10 max-w-[42.5rem] space-y-8">
      <div className="h-24 w-full bg-ink" />
      <label className="type-meta block text-vanilla/60">
        Passcode
        <input
          type="password"
          autoComplete="current-password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className={inputCls}
          autoFocus
        />
      </label>
      {error && (
        <p role="alert" className="type-meta text-mango">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy || !code} className="type-meta text-mango hover:text-vanilla disabled:text-vanilla/30">
        {busy ? 'Opening' : 'Unlock →'}
      </button>
    </form>
  )
}

function Open({ entries }) {
  return (
    <>
      <p className="type-meta mt-6 flex flex-wrap gap-x-6 gap-y-2 text-vanilla/60">
        <span>Re-locks after 10 minutes idle, or when you leave this tab</span>
        <button type="button" onClick={lock} className="text-mango hover:text-vanilla">
          Lock now
        </button>
      </p>

      {entries.length === 0 ? (
        <p className="type-body mt-12">Nothing sealed. Move an entry here from its day.</p>
      ) : (
        <ol className="mt-12 max-w-[64rem] space-y-6">
          {entries.map((e) => (
            <li key={e.id}>
              <EntryFull entry={e} href={`#/today/${e.date}`} showVisibility />
              <p className="mt-3 pl-2">
                <button type="button" onClick={() => setInLockbin(e.date, false)} className="chip">
                  Move out of the Lockbin
                </button>
              </p>
            </li>
          ))}
        </ol>
      )}
    </>
  )
}
