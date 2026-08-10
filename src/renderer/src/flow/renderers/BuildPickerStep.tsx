import { useState } from 'react'
import { Button } from '@renderer/components/Button'
import { StepShell } from '@renderer/components/StepShell'
import type { BuildPickerStep as BuildPickerStepDef } from '@renderer/flow/types'
import './BuildPickerStep.css'

export function BuildPickerStep({
  step,
  selectedId,
  onNext
}: {
  step: BuildPickerStepDef
  selectedId: string
  onNext: (buildId: string) => void
}): React.JSX.Element {
  const [selected, setSelected] = useState(selectedId)

  return (
    <StepShell
      eyebrow={step.eyebrow}
      title={step.title}
      subtitle={step.subtitle}
      media={step.media}
      primary={
        <Button size="lg" withArrow onClick={() => onNext(selected)}>
          Continue
        </Button>
      }
    >
      <div className="build-picker__list">
        {step.options.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`build-picker__card ${selected === option.id ? 'build-picker__card--selected' : ''} ${
              option.recommended ? 'build-picker__card--recommended' : ''
            }`}
            onClick={() => setSelected(option.id)}
          >
            <div className="build-picker__card-top">
              <span className="build-picker__label">{option.label}</span>
              <span className={`build-picker__tag ${option.recommended ? 'build-picker__tag--recommended' : 'build-picker__tag--caution'}`}>
                {option.recommended ? 'Recommended' : (option.tagLabel ?? 'Not actively maintained')}
              </span>
            </div>
            <p className="build-picker__description">{option.description}</p>
          </button>
        ))}
      </div>
    </StepShell>
  )
}
