/** "ABOUT you" — the display face for the first word, the serif italic voice for the second. */
export default function Wordmark({ className = '', youClassName = 'text-mango' }) {
  return (
    <span className={`inline-flex items-baseline gap-[0.18em] whitespace-nowrap ${className}`}>
      <span className="type-display">About</span>
      <span className={`type-serif ${youClassName}`} style={{ fontSize: '1.14em', lineHeight: 0.8 }}>
        you
      </span>
    </span>
  )
}
