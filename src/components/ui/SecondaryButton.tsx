import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface SecondaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  fullWidth?: boolean;
}

export function SecondaryButton({
  children,
  fullWidth = true,
  className = '',
  ...props
}: SecondaryButtonProps) {
  return (
    <button
      className={`btn-secondary ${fullWidth ? 'btn--full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default SecondaryButton;
