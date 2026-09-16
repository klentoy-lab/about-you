import { useState } from 'react'
import { takenHandles } from '../lib/diaries.js'
import {
  AuthError,
  inAppBrowser,
  linkError,
  sendSignInCode,
  signInWithGoogle,
  signOut,
  useSession,
  verifySignInCode,
} from '../lib/auth.js'
import { uploadLocalDiary, useSync } from '../lib/sync.js'
import { clockLabel } from '../lib/date.js'
import { cloudEnabled } from '../lib/supabase.js'
import {
  LockbinError,
  MIN_PASSCODE,
  changePasscode,
  hasPasscode,
  lock,
  removePasscode,
  setPasscode,
  useLockbin,
} from '../lib/lockbin.js'
import { clearEntries, getSettings, listEntries, saveSettings, slugify } from '../lib/store.js'
import { deleteFile } from '../lib/mediaStore.js'
import { useStoreVersion } from '../lib/useStore.js'

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
    <form onSubmit={submit} className="max-w-3xl space-y-12">
      <label className="type-meta block text-vanilla/60">
        {onboarding ? '01 · ' : ''}Your name
        <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className={field} placeholder="Klent" autoFocus={onboarding} />
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
            <span className="text-vanilla/50">aboutyou/</span>
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

      <div className="type-meta flex flex-wrap items-center gap-4">
        <button type="submit" className="chip chip-solid">
          {onboarding ? 'Begin →' : 'Save'}
        </button>
        {!onboarding && savedNote && <span className="text-vanilla/50">{savedNote}</span>}
        {!onboarding && initial.handle && (
          <a href={`#/d/${initial.handle}`} className="chip">
            View your public diary →
          </a>
        )}
      </div>
    </form>
  )

  if (onboarding) {
    return (
      <main className="min-h-svh bg-espresso px-5 py-14 md:px-12 md:py-20">
        <p className="type-meta text-vanilla/60">Three things, then you can write</p>
        <h1 className="type-display mb-14 mt-4 text-[clamp(44px,7vw,104px)] text-vanilla">Start a diary</h1>
        {form}

        {/* Coming back on another device: sign in and the diary arrives — no questions to answer twice. */}
        {cloudEnabled && (
          <section className="rule-hairline mt-20 max-w-3xl pt-10">
            <h2 className="type-display text-[clamp(28px,3.4vw,40px)] text-vanilla">Already have a diary?</h2>
            <p className="type-serif mt-2 text-[22px] text-vanilla/75">Sign in and everything you’ve written comes back.</p>
            <div className="mt-6">
              <AccountSettings />
            </div>
          </section>
        )}
      </main>
    )
  }

  return (
    <main className="px-5 pb-32 pt-12 md:px-12 md:pt-16">
      <h1 className="type-display mb-14 text-[clamp(48px,8vw,120px)] text-vanilla">Settings</h1>
      {cloudEnabled && (
        <Section title="Account" note="Sign in so your diary is saved to the server, syncs across your devices, and can be read by the people you share it with.">
          <AccountSettings />
        </Section>
      )}
      <Section title="Your diary">{form}</Section>
      <Section title="Lockbin" note="A second lock on top of your account. Sealed entries disappear from every public page.">
        <LockbinSettings />
      </Section>
      <Section title="Start fresh" note="Delete every entry and its photos — useful after trying things out.">
        <ClearDiary />
      </Section>
    </main>
  )
}

function Section({ title, note, children }) {
  return (
    <section className="rule-hairline mt-16 max-w-3xl pt-10 first-of-type:mt-0 first-of-type:border-t-0 first-of-type:pt-0">
      <h2 className="type-display text-[clamp(32px,4vw,48px)] text-vanilla">{title}</h2>
      {note && <p className="type-serif mt-2 text-[22px] text-vanilla/75">{note}</p>}
      <div className="mt-8">{children}</div>
    </section>
  )
}

const smallField =
  'mt-2 block w-full max-w-xs border-b border-vanilla/30 bg-transparent py-2 text-[17px] text-vanilla placeholder:text-vanilla/30 focus:border-mango focus:outline-none focus-visible:outline-none'

function Status({ tone, children }) {
  if (!children) return null
  return (
    <p role={tone === 'error' ? 'alert' : 'status'} className={`text-[14px] ${tone === 'error' ? 'text-mango' : 'text-vanilla/70'}`}>
      {children}
    </p>
  )
}

// ── Start fresh ────────────────────────────────────────────────────────────────

function ClearDiary() {
  useStoreVersion()
  const session = useSession()
  const entries = listEntries()
  const [armed, setArmed] = useState(false)
  const [done, setDone] = useState(false)

  const wipe = async () => {
    // photos and video first, so nothing is left behind in this browser's file store
    await Promise.all(entries.flatMap((e) => (e.media ?? []).map((m) => deleteFile(m.id).catch(() => {}))))
    clearEntries()
    setArmed(false)
    setDone(true)
  }

  if (!entries.length) {
    return <Status>{done ? 'Deleted. Your diary is empty.' : 'No entries in this browser.'}</Status>
  }

  return (
    <div className="space-y-4">
      <p className="text-[15px] text-vanilla/75">
        {entries.length} {entries.length === 1 ? 'entry' : 'entries'} in this browser.
        {session && ' Because you’re signed in, deleting them removes them from your account on every device too.'}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => (armed ? wipe() : setArmed(true))}
          onBlur={() => setArmed(false)}
          className={`chip ${armed ? 'chip-solid' : ''}`}
        >
          {armed ? 'Delete everything — sure?' : 'Delete all entries'}
        </button>
        {armed && (
          <button type="button" onClick={() => setArmed(false)} className="chip">
            Keep them
          </button>
        )}
      </div>
    </div>
  )
}

// ── Account ────────────────────────────────────────────────────────────────────

function AccountSettings() {
  const session = useSession()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      setSent(await sendSignInCode(email))
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Couldn’t send the sign-in email')
    }
    setBusy(false)
  }

  if (session) return <SignedIn session={session} />

  if (sent) return <EnterCode email={sent} onBack={() => setSent('')} />


  return (
    <div className="space-y-8">
      <GoogleSignIn />
      <div className="flex items-center gap-4" aria-hidden>
        <span className="h-px flex-1 bg-vanilla/15" />
        <span className="type-meta text-vanilla/45">or use email</span>
        <span className="h-px flex-1 bg-vanilla/15" />
      </div>
    <form onSubmit={submit} className="space-y-5">
      {linkError && <Status tone="error">That sign-in didn’t work — {linkError}. Please try again.</Status>}
      <label className="type-meta block text-vanilla/60">
        Email
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={`${smallField} max-w-sm`}
        />
      </label>
      <Status tone="error">{error}</Status>
      <button type="submit" disabled={busy || !email.trim()} className="chip">
        {busy ? 'Sending…' : 'Email me a sign-in link'}
      </button>
    </form>
    </div>
  )
}

/** One tap: Google's own page, then straight back here signed in. */
function GoogleSignIn() {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (inAppBrowser) {
    return (
      <p className="text-[15px] leading-relaxed text-vanilla/80">
        To continue with Google, open this page in <span className="text-vanilla">Chrome</span> or{' '}
        <span className="text-vanilla">Safari</span> — Google doesn’t allow signing in from inside Facebook, Messenger or
        Instagram. (Use the ••• menu → “Open in browser”.)
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          setError('')
          try {
            await signInWithGoogle() // leaves the page on success
          } catch (err) {
            setError(err instanceof AuthError ? err.message : 'Couldn’t start Google sign-in')
            setBusy(false)
          }
        }}
        className="inline-flex min-h-12 items-center gap-3 rounded-full bg-[#FFF1D6] px-5 text-[15px] font-medium text-[#100C08] transition-colors duration-500 hover:bg-white disabled:opacity-60"
      >
        <GoogleMark />
        {busy ? 'Opening Google…' : 'Continue with Google'}
      </button>
      <Status tone="error">{error}</Status>
    </div>
  )
}

function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 48 48" className="h-5 w-5">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}

/** Step two: the six-digit code, which signs in this browser wherever the email was opened. */
function EnterCode({ email, onBack }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [resent, setResent] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await verifySignInCode(email, code)
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'That code didn’t work')
    }
    setBusy(false)
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <p className="text-[15px] leading-relaxed text-vanilla/80">
        We emailed <span className="text-vanilla">{email}</span>. Open the <span className="text-vanilla">Sign in</span> link in
        that email and you’re done — this page will notice. If the email also shows a six-digit code, you can type it here
        instead.
      </p>
      <label className="type-meta block text-vanilla/60">
        Six-digit code (if your email has one)
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          placeholder="000000"
          className={`${smallField} max-w-40 text-[24px] tracking-[0.4em]`}
        />
      </label>
      <Status tone="error">{error}</Status>
      <Status>{resent}</Status>
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={busy || code.length < 6} className="chip chip-solid">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <button
          type="button"
          onClick={async () => {
            setResent('')
            try {
              await sendSignInCode(email)
              setResent('Sent again — check your email.')
            } catch (err) {
              setError(err.message)
            }
          }}
          className="chip"
        >
          Send another
        </button>
        <button type="button" onClick={onBack} className="chip">
          Use a different email
        </button>
      </div>
    </form>
  )
}

function SignedIn({ session }) {
  const sync = useSync()
  const [uploading, setUploading] = useState(false)

  const STATUS = {
    idle: sync.at ? `Everything saved to the server · ${clockLabel(sync.at)}` : 'Connected',
    syncing: sync.pending ? `Saving ${sync.pending} ${sync.pending === 1 ? 'change' : 'changes'}…` : 'Syncing…',
    'local-only': 'This browser’s diary hasn’t been uploaded yet',
    error: sync.error,
    off: 'Not syncing',
  }

  return (
    <div className="space-y-5">
      <p className="type-meta flex items-center gap-2 text-vanilla">
        <span aria-hidden className={`h-2 w-2 rounded-full ${sync.phase === 'error' ? 'bg-wine' : 'bg-mango'}`} />
        Signed in as {session.user.email}
      </p>
      <Status tone={sync.phase === 'error' ? 'error' : undefined}>{STATUS[sync.phase]}</Status>

      <div className="flex flex-wrap gap-3">
        {/* Always available: sends everything in this browser up again. */}
        <button
          type="button"
          disabled={uploading || sync.phase === 'syncing'}
          onClick={async () => {
            setUploading(true)
            await uploadLocalDiary()
            setUploading(false)
          }}
          className={`chip ${sync.phase === 'error' ? 'chip-solid' : ''}`}
        >
          {uploading || sync.phase === 'syncing' ? 'Syncing…' : sync.phase === 'error' ? 'Try again' : 'Sync now'}
        </button>
        <button type="button" onClick={signOut} className="chip">
          Sign out
        </button>
      </div>
    </div>
  )
}

// ── Lockbin passcode ───────────────────────────────────────────────────────────

function LockbinSettings() {
  useStoreVersion()
  const unlocked = useLockbin()
  const has = hasPasscode()
  const sealed = listEntries().filter((e) => e.inLockbin).length
  const [mode, setMode] = useState(null) // 'change' | 'remove' | null
  const [done, setDone] = useState('')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <p className="type-meta flex items-center gap-2 text-vanilla">
          <span aria-hidden className={`h-2 w-2 rounded-full ${has ? (unlocked ? 'bg-mango' : 'bg-vanilla') : 'border border-vanilla/50'}`} />
          {!has ? 'No passcode set' : unlocked ? 'Passcode set · open now' : 'Passcode set · locked'}
        </p>
        <p className="type-meta text-vanilla/50">
          {sealed} sealed {sealed === 1 ? 'entry' : 'entries'}
        </p>
        {has && unlocked && (
          <button type="button" onClick={lock} className="chip">
            Lock now
          </button>
        )}
      </div>

      <Status>{done}</Status>

      {!has ? (
        <PasscodeForm
          submitLabel="Set passcode"
          onSubmit={async ({ next }) => {
            await setPasscode(next)
            setDone('Passcode set. The Lockbin re-locks after 10 minutes idle or when you leave the tab.')
          }}
        />
      ) : mode === 'change' ? (
        <PasscodeForm
          askCurrent
          submitLabel="Change passcode"
          onCancel={() => setMode(null)}
          onSubmit={async ({ current, next }) => {
            await changePasscode(current, next)
            setMode(null)
            setDone('Passcode changed.')
          }}
        />
      ) : mode === 'remove' ? (
        <RemovePasscode
          sealed={sealed}
          onCancel={() => setMode(null)}
          onRemoved={() => {
            setMode(null)
            setDone('Passcode removed.')
          }}
        />
      ) : (
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => (setDone(''), setMode('change'))} className="chip">
            Change passcode
          </button>
          <button type="button" onClick={() => (setDone(''), setMode('remove'))} className="chip">
            Remove passcode
          </button>
        </div>
      )}
    </div>
  )
}

function PasscodeForm({ askCurrent = false, submitLabel, onSubmit, onCancel }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [again, setAgain] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (next.length < MIN_PASSCODE) return setError(`New passcode needs at least ${MIN_PASSCODE} characters`)
    if (next !== again) return setError('The new passcodes don’t match')
    if (askCurrent && next === current) return setError('That’s the same as your current passcode')
    setBusy(true)
    try {
      await onSubmit({ current, next })
    } catch (err) {
      setError(err instanceof LockbinError ? err.message : 'Couldn’t save the passcode')
    }
    setBusy(false)
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {askCurrent && (
        <label className="type-meta block text-vanilla/60">
          Current passcode
          <input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={smallField} autoFocus />
        </label>
      )}
      <div className="grid gap-6 sm:grid-cols-2">
        <label className="type-meta block text-vanilla/60">
          {askCurrent ? 'New passcode' : 'Passcode'}
          <input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className={smallField} autoFocus={!askCurrent} />
        </label>
        <label className="type-meta block text-vanilla/60">
          Type it again
          <input type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} className={smallField} />
        </label>
      </div>
      <Status tone="error">{error}</Status>
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={busy || !next || !again || (askCurrent && !current)} className="chip chip-solid">
          {busy ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="chip">
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

function RemovePasscode({ sealed, onCancel, onRemoved }) {
  const [current, setCurrent] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await removePasscode(current, sealed)
      onRemoved()
    } catch (err) {
      setError(err instanceof LockbinError ? err.message : 'Couldn’t remove the passcode')
    }
    setBusy(false)
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {sealed > 0 && (
        <p className="text-[15px] text-vanilla/75">
          {sealed} {sealed === 1 ? 'entry is' : 'entries are'} sealed. Move {sealed === 1 ? 'it' : 'them'} out from the{' '}
          <a href="#/lockbin" className="text-mango underline-offset-4 hover:underline">
            Lockbin
          </a>{' '}
          before removing the passcode.
        </p>
      )}
      <label className="type-meta block text-vanilla/60">
        Current passcode
        <input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={smallField} autoFocus />
      </label>
      <Status tone="error">{error}</Status>
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={busy || !current || sealed > 0} className="chip chip-solid">
          {busy ? 'Checking…' : 'Remove passcode'}
        </button>
        <button type="button" onClick={onCancel} className="chip">
          Cancel
        </button>
      </div>
    </form>
  )
}
