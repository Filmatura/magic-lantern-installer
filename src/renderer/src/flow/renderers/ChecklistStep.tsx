import { Button } from '@renderer/components/Button'
import { StepShell } from '@renderer/components/StepShell'
import lexarSilverPlus from '@renderer/assets/step-images/lexar-silver-plus-256gb.png'
import sandiskExtremePro from '@renderer/assets/step-images/sandisk-extreme-pro-256gb.png'
import type { ChecklistStep as ChecklistStepDef } from '@renderer/flow/types'
import './ChecklistStep.css'

const IMAGE_MAP: Record<string, string> = {
  'lexar-silver-plus': lexarSilverPlus,
  'sandisk-extreme-pro': sandiskExtremePro
}

export function ChecklistStep({ step, onNext }: { step: ChecklistStepDef; onNext: () => void }): React.JSX.Element {
  return (
    <StepShell
      eyebrow={step.eyebrow}
      title={step.title}
      subtitle={step.subtitle}
      media={step.media}
      primary={
        <Button size="lg" withArrow onClick={onNext}>
          {step.cta ?? 'Continue'}
        </Button>
      }
    >
      <ul className="checklist-step__list">
        {step.items.map((item, i) => (
          <li key={i} className="checklist-step__item">
            <span className="checklist-step__bullet" aria-hidden>
              ✓
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>

      {step.recommendations && (
        <div className="checklist-step__recs">
          <div className="checklist-step__recs-title">{step.recommendations.title}</div>
          <div className="checklist-step__recs-grid">
            {step.recommendations.products
              .slice()
              .sort((a, b) => a.rank - b.rank)
              .map((product) => (
                <div key={product.name} className="checklist-step__rec-card">
                  <span className="checklist-step__rec-rank">#{product.rank} Pick</span>
                  <span className="checklist-step__rec-image">
                    <img src={IMAGE_MAP[product.image] ?? product.image} alt={product.name} />
                  </span>
                  <span className="checklist-step__rec-name">{product.name}</span>
                  {product.note && <span className="checklist-step__rec-note">{product.note}</span>}
                </div>
              ))}
          </div>
          {step.recommendations.note && <p className="checklist-step__recs-footnote">{step.recommendations.note}</p>}
        </div>
      )}
    </StepShell>
  )
}
