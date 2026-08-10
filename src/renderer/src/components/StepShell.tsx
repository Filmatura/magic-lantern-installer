import type { ReactNode } from 'react'
import type { MediaSpec } from '@renderer/flow/types'
import { useAppState } from '@renderer/state/AppState'
import { BackButton } from './BackButton'
import { MediaSlot } from './MediaSlot'
import './StepShell.css'

interface StepShellProps {
  eyebrow?: string
  title: string
  subtitle?: string
  media?: MediaSpec
  children?: ReactNode
  /** Right-side footer action (e.g. a "Continue" button). Omit for steps like questions where options are the action. */
  primary?: ReactNode
  align?: 'left' | 'center'
}

export function StepShell({ eyebrow, title, subtitle, media, children, primary, align = 'left' }: StepShellProps): React.JSX.Element {
  const { back, canGoBack } = useAppState()

  return (
    <div className={`step-shell step-shell--${align}`}>
      <div className="step-shell__scroll scroll-region">
        <div className="step-shell__inner">
          {eyebrow && <div className="step-shell__eyebrow">{eyebrow}</div>}
          <h1 className="step-shell__title">{title}</h1>
          {subtitle && <p className="step-shell__subtitle">{subtitle}</p>}
          <MediaSlot media={media} />
          {children}
        </div>
      </div>
      <div className="step-shell__footer">
        <div className="step-shell__footer-left">{canGoBack && <BackButton onClick={back} />}</div>
        <div className="step-shell__footer-right">{primary}</div>
      </div>
    </div>
  )
}
