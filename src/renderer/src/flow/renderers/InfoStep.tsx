import { Button } from '@renderer/components/Button'
import { StepShell } from '@renderer/components/StepShell'
import type { InfoStep as InfoStepDef } from '@renderer/flow/types'
import './InfoStep.css'

export function InfoStep({
  step,
  onNext,
  onGoto
}: {
  step: InfoStepDef
  onNext: () => void
  onGoto: (stepId: string) => void
}): React.JSX.Element {
  return (
    <StepShell
      eyebrow={step.eyebrow}
      title={step.title}
      subtitle={step.subtitle}
      media={step.media}
      primary={
        <>
          {step.secondaryAction && (
            <Button variant="secondary" onClick={() => onGoto(step.secondaryAction!.goto)}>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden>
                <circle cx="7.5" cy="7.5" r="6.25" />
                <path d="M5.7 5.8a1.8 1.8 0 1 1 2.7 1.6c-.7.4-1.1.8-1.1 1.6" />
                <circle cx="7.5" cy="10.7" r="0.2" fill="currentColor" stroke="none" />
              </svg>
              {step.secondaryAction.label}
            </Button>
          )}
          <Button size="lg" withArrow onClick={onNext}>
            {step.cta ?? 'Continue'}
          </Button>
        </>
      }
    >
      {step.body && (
        <ol className="info-step__body">
          {step.body.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ol>
      )}
      {step.note && <div className={`info-step__note info-step__note--${step.note.tone}`}>{step.note.text}</div>}
    </StepShell>
  )
}
