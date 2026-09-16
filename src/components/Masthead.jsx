import FitText from './FitText.jsx'

/** "TO" in mono above the recipient's name, filling the width. Optional serif byline and actions beneath. */
export default function Masthead({ name, meta, byline, actions, as = 'h1' }) {
  return (
    <div>
      <p className="type-meta text-vanilla">To</p>
      <FitText as={as} className="type-display mt-2 text-vanilla" style={{ letterSpacing: '-0.04em', lineHeight: 0.86 }}>
        {name}
      </FitText>
      {byline && <p className="type-serif mt-5 text-[clamp(26px,3.6vw,46px)] text-vanilla/90">{byline}</p>}
      {(meta || actions) && (
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-4">
          {meta && <p className="type-meta text-vanilla/60">{meta}</p>}
          {actions}
        </div>
      )}
    </div>
  )
}
