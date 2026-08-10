import filmaturaBlack from '@renderer/assets/brand/filmatura-black.png'
import './ProgressHeader.css'

interface ProgressHeaderProps {
  stepNumber: number
  totalSteps: number
}

export function ProgressHeader({ stepNumber, totalSteps }: ProgressHeaderProps): React.JSX.Element {
  const pct = Math.round((stepNumber / totalSteps) * 100)
  return (
    <header className="progress-header">
      <div className="progress-header__row">
        <img src={filmaturaBlack} alt="Filmatura" className="progress-header__logo" />
        <span className="progress-header__count">
          {stepNumber} / {totalSteps}
        </span>
      </div>
      <div className="progress-header__track">
        <div className="progress-header__fill" style={{ width: `${pct}%` }} />
      </div>
    </header>
  )
}
