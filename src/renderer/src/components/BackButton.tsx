import './BackButton.css'

export function BackButton({ onClick }: { onClick: () => void }): React.JSX.Element {
  return (
    <button type="button" className="back-btn" onClick={onClick}>
      <span className="back-btn__arrow" aria-hidden>
        ‹
      </span>
      Back
    </button>
  )
}
