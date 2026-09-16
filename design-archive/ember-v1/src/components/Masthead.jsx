import FitText from './FitText.jsx'

/** "TO" in mono above the recipient's name, filling the width. Vanilla on espresso. */
export default function Masthead({ name, meta, as = 'h1' }) {
  return (
    <div>
      <p className="type-meta text-vanilla">To</p>
      <FitText
        as={as}
        className="type-display mt-2 text-vanilla"
        style={{ letterSpacing: '-0.04em', lineHeight: 0.86 }}
      >
        {name}
      </FitText>
      {meta && <p className="type-meta mt-6 text-vanilla/60">{meta}</p>}
    </div>
  )
}
