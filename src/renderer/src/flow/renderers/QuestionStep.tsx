import { StepShell } from '@renderer/components/StepShell'
import type { QuestionOption, QuestionStep as QuestionStepDef } from '@renderer/flow/types'
import './QuestionStep.css'

export function QuestionStep({
  step,
  onChoose
}: {
  step: QuestionStepDef
  onChoose: (option: QuestionOption) => void
}): React.JSX.Element {
  return (
    <StepShell eyebrow={step.eyebrow} title={step.title} subtitle={step.subtitle} media={step.media}>
      <div className="question-step__options">
        {step.options.map((option) => (
          <button
            key={option.label}
            type="button"
            className={`question-step__option ${option.tone === 'primary' ? 'question-step__option--primary' : ''}`}
            onClick={() => onChoose(option)}
          >
            <span className="question-step__option-label">{option.label}</span>
            {option.description && <span className="question-step__option-desc">{option.description}</span>}
          </button>
        ))}
      </div>
    </StepShell>
  )
}
