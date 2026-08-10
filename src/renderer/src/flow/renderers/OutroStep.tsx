import filmaturaBlack from '@renderer/assets/brand/filmatura-black.png'
import eosMImage from '@renderer/assets/collections/eos-m.jpg'
import mLiteImage from '@renderer/assets/collections/m-lite.jpg'
import { Button } from '@renderer/components/Button'
import { useAppState } from '@renderer/state/AppState'
import type { OutroStep as OutroStepDef } from '@renderer/flow/types'
import './OutroStep.css'

const IMAGE_MAP: Record<string, string> = {
  'https://filmatura.com/collections/m-lite': mLiteImage,
  'https://filmatura.com/collections/eos-m': eosMImage
}

export function OutroStep({ step }: { step: OutroStepDef }): React.JSX.Element {
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

          <div className="outro-step__thanks">
            <p>{step.thanksCopy}</p>
            <p className="outro-step__thanks-name">- with thanks to {step.thanksTo}</p>
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

          <div className="outro-step__links">
            {step.links.map((link) => (
              <button key={link.url} type="button" className="outro-step__link" onClick={() => open(link.url)}>
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
        </div>
      </div>

      <div className="outro-step__footer">
        <Button variant="secondary" onClick={reset}>
          Start over
        </Button>
        <Button variant="secondary" onClick={quit}>
          Close app
        </Button>
      </div>
    </div>
  )
}
