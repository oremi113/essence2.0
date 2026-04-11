import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  fullWidth?: boolean;
  isLoading?: boolean;
}

export function PrimaryButton({
  children,
  fullWidth = true,
  isLoading = false,
  disabled,
  className = '',
  ...props
}: PrimaryButtonProps) {
  return (
    <button
      className={`btn-primary ${fullWidth ? 'btn--full' : ''} ${className}`}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="btn-primary__loader" aria-hidden="true" />
      ) : (
        children
      )}
    </button>
  );
}

export default PrimaryButton;
