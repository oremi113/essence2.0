import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface LinkButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  fullWidth?: boolean;
}

export function LinkButton({
  children,
  fullWidth = true,
  className = '',
  ...props
}: LinkButtonProps) {
  return (
    <button
      className={`btn-link ${fullWidth ? 'btn--full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default LinkButton;
