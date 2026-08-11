import { useMemo, useRef } from 'react'
import { computeVisiblePath, getStep } from '@renderer/flow/steps'
import { useAppState } from '@renderer/state/AppState'
import type { FlowStateValues } from '@renderer/flow/types'
import { ProgressHeader } from '@renderer/components/ProgressHeader'
import { WelcomeStep } from './renderers/WelcomeStep'
import { ChecklistStep } from './renderers/ChecklistStep'
import { InfoStep } from './renderers/InfoStep'
import { QuestionStep } from './renderers/QuestionStep'
import { AutoActionStep } from './renderers/AutoActionStep'
import { DrivePickerStep } from './renderers/DrivePickerStep'
import { BuildPickerStep } from './renderers/BuildPickerStep'
import { TroubleshootStep } from './renderers/TroubleshootStep'
import { OutroStep } from './renderers/OutroStep'
import './StepEngine.css'

export function StepEngine(): React.JSX.Element {
  const { currentStepId, goto, direction, values } = useAppState()
  const step = getStep(currentStepId)

  const goNext = (setState?: Partial<FlowStateValues>): void => {
    if ('next' in step && step.next) goto(step.next, setState)
  }

  const bareChrome = step.type === 'welcome' || step.type === 'outro' || step.bareChrome === true

  // Total step count - and the current step's position within it - depend
  // on which branch the firmware question resolves to, so this is
  // recomputed from current answers rather than a fixed list. If the
  // current step is itself hidden from progress (e.g. the firmware retry
  // question), we keep showing the last real position instead of jumping
  // back to 1 - that jump reads as a bug even though nothing is wrong.
  const visiblePath = useMemo(() => computeVisiblePath(values), [values])
  const lastGoodPosition = useRef(1)
  const idxInVisible = visiblePath.indexOf(step.id)
  if (idxInVisible !== -1) lastGoodPosition.current = idxInVisible + 1

  const body = (() => {
    switch (step.type) {
      case 'welcome':
        return <WelcomeStep step={step} onNext={goNext} onGoto={goto} />
      case 'checklist':
        return <ChecklistStep step={step} onNext={goNext} />
      case 'info':
        return <InfoStep step={step} onNext={goNext} onGoto={goto} />
      case 'question':
        return <QuestionStep step={step} onChoose={(option) => goto(option.goto, option.setState)} />
      case 'auto':
        return <AutoActionStep step={step} onNext={goNext} onGoto={goto} />
      case 'drive-picker':
        return (
          <DrivePickerStep
            step={step}
            selectedId={step.clearPriorSelection ? null : (values.selectedDrive?.id ?? null)}
            onNext={(drive) => goto(step.next!, { selectedDrive: drive })}
          />
        )
      case 'build-picker':
        return (
          <BuildPickerStep
            step={step}
            selectedId={values.selectedBuildId}
            onNext={(buildId) => goto(step.next!, { selectedBuildId: buildId })}
          />
        )
      case 'troubleshoot':
        return <TroubleshootStep step={step} onNext={goNext} />
      case 'outro':
        return <OutroStep step={step} onGoto={goto} />
    }
  })()

  const animated = (
    <div key={step.id} className={`step-transition step-transition--${direction}`}>
      {body}
    </div>
  )

  if (bareChrome) {
    return <div className="step-engine step-engine--bare">{animated}</div>
  }

  return (
    <div className="step-engine">
      <ProgressHeader stepNumber={lastGoodPosition.current} totalSteps={visiblePath.length} />
      <div className="step-engine__body">{animated}</div>
    </div>
  )
}
