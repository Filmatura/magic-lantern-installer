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
