import { useLayoutEffect, useRef } from 'react'

/** One line of display type sized to fill its container edge to edge. */
export default function FitText({ children, className = '', min = 32, max = 900, as: Tag = 'span', ...rest }) {
  const box = useRef(null)
  const text = useRef(null)

  useLayoutEffect(() => {
    const fit = () => {
      if (!box.current || !text.current) return
      const probe = 100
      text.current.style.fontSize = `${probe}px`
      const w = text.current.getBoundingClientRect().width
      if (!w) return
      const size = Math.min(max, Math.max(min, Math.floor((box.current.clientWidth / w) * probe * 0.995)))
      text.current.style.fontSize = `${size}px`
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(box.current)
    document.fonts?.ready.then(fit)
    return () => ro.disconnect()
  }, [children, min, max])

  return (
    <div ref={box} className="w-full">
      <Tag ref={text} className={`inline-block whitespace-nowrap ${className}`} {...rest}>
        {children}
      </Tag>
    </div>
  )
}
