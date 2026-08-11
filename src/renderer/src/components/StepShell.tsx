import { useState, type ReactNode } from 'react'
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
  // Video starts side-by-side with the steps; this lets it take over the
  // full width instead, stacked above the steps rather than beside them -
  // still inside the scrollable content area, never an overlay on top of
  // the steps and never OS/browser fullscreen.
  const [videoExpanded, setVideoExpanded] = useState(false)

  return (
    <div className={`step-shell step-shell--${align}`}>
      <div className="step-shell__scroll scroll-region">
        <div className="step-shell__inner">
          {eyebrow && <div className="step-shell__eyebrow">{eyebrow}</div>}
          <h1 className="step-shell__title">{title}</h1>
          {subtitle && <p className="step-shell__subtitle">{subtitle}</p>}
          {media ? (
            <div className={`step-shell__media-row ${videoExpanded ? 'step-shell__media-row--expanded' : ''}`}>
              <div className="step-shell__media-col">
                <MediaSlot media={media} />
                {media.kind === 'video' && (
                  <button
                    type="button"
                    className="step-shell__media-toggle"
                    onClick={() => setVideoExpanded((v) => !v)}
                    aria-label={videoExpanded ? 'Shrink video' : 'Enlarge video'}
                    title={videoExpanded ? 'Shrink video' : 'Enlarge video'}
                  >
                    {videoExpanded ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <polyline points="4 14 10 14 10 20" />
                        <polyline points="20 10 14 10 14 4" />
                        <line x1="14" y1="10" x2="21" y2="3" />
                        <line x1="3" y1="21" x2="10" y2="14" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <polyline points="15 3 21 3 21 9" />
                        <polyline points="9 21 3 21 3 15" />
                        <line x1="21" y1="3" x2="14" y2="10" />
                        <line x1="3" y1="21" x2="10" y2="14" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
              <div className="step-shell__content-col">{children}</div>
            </div>
          ) : (
            children
          )}
        </div>
      </div>
      <div className="step-shell__footer">
        <div className="step-shell__footer-left">{canGoBack && <BackButton onClick={back} />}</div>
        <div className="step-shell__footer-right">{primary}</div>
      </div>
    </div>
  )
}
