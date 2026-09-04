import type { ReactNode } from 'react'
import './Modal.css'

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }): React.JSX.Element {
  return (
    <div className="modal__backdrop" onClick={onClose}>
      <div className="modal__panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">{title}</h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="modal__body scroll-region">{children}</div>
      </div>
    </div>
  )
}
