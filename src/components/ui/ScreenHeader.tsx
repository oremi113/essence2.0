'use client';

import { useRouter } from 'next/navigation';

interface ScreenHeaderProps {
  /** The main title displayed in Spectral */
  title?: string;
  /** Subtitle displayed below the title in Inter */
  subtitle?: string;
  /** If provided, shows a back arrow + this label */
  backLabel?: string;
  /** Override the back destination. Defaults to router.back() */
  backHref?: string;
  /** Small uppercase label above the title — e.g. "STAGE 1 OF 3" */
  eyebrow?: string;
  className?: string;
}

export function ScreenHeader({
  title,
  subtitle,
  backLabel,
  backHref,
  eyebrow,
  className = '',
}: ScreenHeaderProps) {
  const router = useRouter();

  function handleBack() {
    if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  }

  return (
    <header className={`screen-header ${className}`}>
      {backLabel && (
        <button
          className="screen-header__back"
          onClick={handleBack}
          aria-label={`Go back to ${backLabel}`}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M11 14L6 9l5-5" />
          </svg>
          <span>{backLabel}</span>
        </button>
      )}

      {eyebrow && <p className="screen-header__eyebrow">{eyebrow}</p>}

      {title && <h1 className="screen-header__title">{title}</h1>}

      {subtitle && <p className="screen-header__subtitle">{subtitle}</p>}
    </header>
  );
}

export default ScreenHeader;
