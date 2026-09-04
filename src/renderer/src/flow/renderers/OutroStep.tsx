import type { ReactNode } from 'react'
import filmaturaBlack from '@renderer/assets/brand/filmatura-black.png'
import eosMImage from '@renderer/assets/collections/eos-m.jpg'
import mLiteImage from '@renderer/assets/collections/m-lite.jpg'
import { Button } from '@renderer/components/Button'
import { useAppState } from '@renderer/state/AppState'
import { track } from '@renderer/services/analytics'
import type { OutroStep as OutroStepDef, SocialPlatform } from '@renderer/flow/types'
import './OutroStep.css'

const IMAGE_MAP: Record<string, string> = {
  'https://filmatura.com/collections/m-lite': mLiteImage,
  'https://filmatura.com/collections/eos-m': eosMImage
}

const SOCIAL_ICONS: Record<SocialPlatform, ReactNode> = {
  website: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <circle cx="10" cy="10" r="7.5" />
      <ellipse cx="10" cy="10" rx="3.2" ry="7.5" />
      <line x1="2.5" y1="10" x2="17.5" y2="10" />
    </svg>
  ),
  youtube: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <rect x="2" y="5" width="16" height="10" rx="3" />
      <path d="M8.5 8L12.5 10L8.5 12V8Z" fill="currentColor" stroke="none" />
    </svg>
  ),
  instagram: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <rect x="2.5" y="2.5" width="15" height="15" rx="4" />
      <circle cx="10" cy="10" r="3.4" />
      <circle cx="14.4" cy="5.6" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  ),
  discord: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden>
      <path d="M4 13.6C3 9 4.5 5.5 7 4.5C7.4 5 7.7 5.4 8 5.8C8.6 5.6 9.3 5.5 10 5.5C10.7 5.5 11.4 5.6 12 5.8C12.3 5.4 12.6 5 13 4.5C15.5 5.5 17 9 16 13.6C14.5 14.7 12.8 15.3 11.2 15.5L10.5 14.2C10.8 14.1 11.1 14 11.4 13.8C10.3 14.1 9.7 14.1 8.6 13.8C8.9 14 9.2 14.1 9.5 14.2L8.8 15.5C7.2 15.3 5.5 14.7 4 13.6Z" />
      <circle cx="7.7" cy="10.4" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="12.3" cy="10.4" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  ),
  github: (
    <svg viewBox="0 0 20 20" fill="currentColor" stroke="none" aria-hidden>
      <path d="M10 1.5C5.3 1.5 1.5 5.3 1.5 10c0 3.8 2.5 7 5.9 8.1.4.1.6-.2.6-.4v-1.6c-2.4.5-2.9-1.1-2.9-1.1-.4-1-1-1.3-1-1.3-.8-.6.1-.6.1-.6.9.1 1.4.9 1.4.9.8 1.4 2.1 1 2.6.8.1-.6.3-1 .6-1.3-1.9-.2-4-1-4-4.3 0-.9.3-1.7.9-2.3-.1-.2-.4-1.1.1-2.3 0 0 .7-.2 2.4.9a8 8 0 0 1 4.4 0c1.7-1.1 2.4-.9 2.4-.9.5 1.2.2 2.1.1 2.3.6.6.9 1.4.9 2.3 0 3.3-2.1 4.1-4 4.3.3.3.6.8.6 1.6v2.4c0 .2.2.5.6.4 3.4-1.1 5.9-4.3 5.9-8.1 0-4.7-3.8-8.5-8.5-8.5Z" />
    </svg>
  )
}

const SOCIAL_LABELS: Record<SocialPlatform, string> = {
  website: 'Website',
  youtube: 'YouTube',
  instagram: 'Instagram',
  discord: 'Discord',
  github: 'GitHub'
}

/** Turns every `credits[].name` occurrence in `text` into a link, leaving everything else as plain text. */
function renderWithCredits(text: string, credits: { name: string; url: string }[], onOpen: (url: string) => void): ReactNode[] {
  if (credits.length === 0) return [text]
  const pattern = new RegExp(`(${credits.map((c) => c.name).join('|')})`, 'g')
  return text.split(pattern).map((part, i) => {
    const credit = credits.find((c) => c.name === part)
    if (!credit) return part
    return (
      <button key={`${part}-${i}`} type="button" className="outro-step__credit-link" onClick={() => onOpen(credit.url)}>
        {part}
      </button>
    )
  })
}

export function OutroStep({
  step,
  onGoto
}: {
  step: OutroStepDef
  onGoto: (stepId: string) => void
}): React.JSX.Element {
  const { reset, values } = useAppState()
  const drive = values.selectedDrive

  const open = (url: string): void => {
    void window.api?.openExternal(url)
  }

  const quit = (): void => {
    void window.api?.quit()
  }

  return (
    <div className="outro-step">
      <div className="outro-step__scroll scroll-region">
        <div className="outro-step__content">
          <img src={filmaturaBlack} alt="Filmatura" className="outro-step__brand" />
          <div className="outro-step__check" aria-hidden>
            ✓
          </div>
          <h1 className="outro-step__title">{step.title}</h1>

          <div className="outro-step__links">
            {step.links.map((link) => (
              <button
                key={link.url}
                type="button"
                className="outro-step__link"
                onClick={() => {
                  track('ad_clicked', { label: link.label, url: link.url })
                  open(link.url)
                }}
              >
                {IMAGE_MAP[link.url] && (
                  <span className="outro-step__link-image">
                    <img src={IMAGE_MAP[link.url]} alt="" />
                  </span>
                )}
                <span className="outro-step__link-text">
                  <span className="outro-step__link-label">{link.label}</span>
                  {link.description && <span className="outro-step__link-desc">{link.description}</span>}
                  <span className="outro-step__link-cta">Shop now →</span>
                </span>
              </button>
            ))}
          </div>

          <div className="outro-step__summary">
            <div className="outro-step__summary-row">
              <span>Card</span>
              <strong>{drive ? `${drive.name} · ${drive.sizeGb} GB` : 'Not recorded'}</strong>
            </div>
            <div className="outro-step__summary-row">
              <span>Magic Lantern</span>
              <strong>{values.mlVersion ?? 'Not recorded'}</strong>
            </div>
            <div className="outro-step__summary-row">
              <span>Build</span>
              <strong>{values.mlBuildName ?? 'Not recorded'}</strong>
            </div>
          </div>

          <div className="outro-step__thanks">
            <p>{renderWithCredits(step.thanksCopy, step.credits, open)}</p>
          </div>

          <div className="outro-step__socials">
            {step.socialLinks.map((social) => (
              <button
                key={social.platform}
                type="button"
                className="outro-step__social-btn"
                onClick={() => open(social.url)}
                aria-label={SOCIAL_LABELS[social.platform]}
                title={SOCIAL_LABELS[social.platform]}
              >
                {SOCIAL_ICONS[social.platform]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="outro-step__footer">
        <Button variant="secondary" onClick={reset}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          Start over
        </Button>
        <Button variant="secondary" onClick={() => onGoto('troubleshoot')}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden>
            <circle cx="7.5" cy="7.5" r="6.25" />
            <path d="M5.7 5.8a1.8 1.8 0 1 1 2.7 1.6c-.7.4-1.1.8-1.1 1.6" />
            <circle cx="7.5" cy="10.7" r="0.2" fill="currentColor" stroke="none" />
          </svg>
          Having trouble?
        </Button>
        <Button variant="secondary" onClick={quit}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
            <line x1="2" y1="2" x2="11" y2="11" />
            <line x1="11" y1="2" x2="2" y2="11" />
          </svg>
          Close app
        </Button>
      </div>
    </div>
  )
}
