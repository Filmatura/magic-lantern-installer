import type { ButtonHTMLAttributes } from 'react'
import './Button.css'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'md' | 'lg'
  /** Appends a right-pointing arrow - use for steps that move the flow forward. */
  withArrow?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  withArrow,
  children,
  ...rest
}: ButtonProps): React.JSX.Element {
  return (
    <button className={['ml-btn', `ml-btn--${variant}`, `ml-btn--${size}`, className].filter(Boolean).join(' ')} {...rest}>
      {children}
      {withArrow && (
        <span className="ml-btn__arrow" aria-hidden>
          →
        </span>
      )}
    </button>
  )
}
