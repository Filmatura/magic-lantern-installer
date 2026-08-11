import { useCallback, useRef, useState } from 'react'
import './HoldToConfirm.css'

interface HoldToConfirmProps {
  label: string
  holdingLabel?: string
  durationMs?: number
  onConfirm: () => void
  disabled?: boolean
}

/**
 * Press-and-hold confirmation for destructive actions (formatting a card).
 * Releasing early cancels and resets - there is no accidental single click
 * that triggers a format.
 */
export function HoldToConfirm({
  label,
  holdingLabel = 'Keep holding…',
  durationMs = 3000,
  onConfirm,
  disabled
}: HoldToConfirmProps): React.JSX.Element {
  const [progress, setProgress] = useState(0)
  const [holding, setHolding] = useState(false)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number>(0)

  const stop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    setHolding(false)
    setProgress(0)
  }, [])

  const tick = useCallback(() => {
    const elapsed = performance.now() - startRef.current
    const pct = Math.min(1, elapsed / durationMs)
    setProgress(pct)
    if (pct >= 1) {
      stop()
      onConfirm()
      return
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [durationMs, onConfirm, stop])

  const start = useCallback(() => {
    if (disabled) return
    startRef.current = performance.now()
    setHolding(true)
    rafRef.current = requestAnimationFrame(tick)
  }, [disabled, tick])

  const text = holding ? holdingLabel : label

  return (
    <button
      type="button"
      className={`hold-confirm ${holding ? 'hold-confirm--active' : ''}`}
      disabled={disabled}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
    >
      {/* Base layer: red label on the pale background, for whatever the red
          fill hasn't reached yet. */}
      <span className="hold-confirm__label hold-confirm__label--base">{text}</span>
      {/* Overlay: red background + white label, both full-width and laid
          out identically to the base layer, then clipped to the fill's
          current progress. This is what makes the white text line up
          pixel-for-pixel with the red text as the clip reveals more of it -
          the earlier version just swapped the whole label to white on
          press, which was invisible against the still-pale, not-yet-filled
          background. */}
      <span className="hold-confirm__fill" style={{ clipPath: `inset(0 ${100 - progress * 100}% 0 0)` }}>
        <span className="hold-confirm__label">{text}</span>
      </span>
    </button>
  )
}
