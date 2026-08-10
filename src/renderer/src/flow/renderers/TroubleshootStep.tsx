import { Button } from '@renderer/components/Button'
import { StepShell } from '@renderer/components/StepShell'
import { TidioChat } from '@renderer/components/TidioChat'
import type { TroubleshootStep as TroubleshootStepDef } from '@renderer/flow/types'
import './TroubleshootStep.css'

export function TroubleshootStep({ step, onNext }: { step: TroubleshootStepDef; onNext: () => void }): React.JSX.Element {
  return (
    <StepShell
      eyebrow={step.eyebrow}
      title={step.title}
      subtitle={step.subtitle}
      media={step.media}
      primary={
        <Button size="lg" withArrow onClick={onNext}>
          Back to setup
        </Button>
      }
    >
      <div className="troubleshoot-step__list">
        {step.issues.map((issue) => (
          <div key={issue.title} className="troubleshoot-step__issue">
            <div className="troubleshoot-step__issue-title">{issue.title}</div>
            <p className="troubleshoot-step__issue-desc">{issue.description}</p>
          </div>
        ))}
      </div>
      <TidioChat />
    </StepShell>
  )
}
