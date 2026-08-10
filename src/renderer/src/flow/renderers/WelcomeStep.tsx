import { useEffect, useState } from 'react'
import filmaturaBlack from '@renderer/assets/brand/filmatura-black.png'
import { Button } from '@renderer/components/Button'
import { checkForUpdate, type UpdateManifest } from '@renderer/services/updateCheck'
import { APP_VERSION } from '@renderer/version'
import type { WelcomeStep as WelcomeStepDef } from '@renderer/flow/types'
import './WelcomeStep.css'

export function WelcomeStep({ step, onNext }: { step: WelcomeStepDef; onNext: () => void }): React.JSX.Element {
  const [update, setUpdate] = useState<UpdateManifest | null>(null)

  useEffect(() => {
    checkForUpdate(APP_VERSION).then(setUpdate)
  }, [])

  return (
    <div className="welcome-step">
      <div className="welcome-step__content">
        <img src={filmaturaBlack} alt="Filmatura" className="welcome-step__brand" />
        <span className="welcome-step__version">v{APP_VERSION}</span>
        <h1 className="welcome-step__title">{step.title}</h1>
        <p className="welcome-step__subtitle">{step.subtitle}</p>
        <Button size="lg" withArrow onClick={onNext} className="welcome-step__cta">
          Get started
        </Button>
        {update && (
          <button
            type="button"
            className="welcome-step__update"
            onClick={() => window.api?.openExternal(update.url)}
          >
            Update available - v{update.version} →
          </button>
        )}
      </div>
      <p className="welcome-step__footnote">Takes about 10 minutes. We'll guide you through every step.</p>
    </div>
  )
}
