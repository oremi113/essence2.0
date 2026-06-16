import type { ReactNode } from 'react';

/**
 * Shared chrome for the app-wide system pages (error / not-found). A calm,
 * warm, full-screen message in the app's voice — never an alarming default
 * Next.js error page. Pure + presentational; callers supply the action
 * (a reset button, a link home) as children.
 */
export function SystemScreen({
  title,
  body,
  children,
}: {
  title: string;
  body?: string;
  children?: ReactNode;
}) {
  return (
    <div className="system-screen">
      <style>{SYSTEM_SCREEN_CSS}</style>
      <div className="system-screen__inner" role="status">
        <h1 className="system-screen__title">{title}</h1>
        {body && <p className="system-screen__body">{body}</p>}
        {children && <div className="system-screen__action">{children}</div>}
      </div>
    </div>
  );
}

export const SYSTEM_SCREEN_CSS = `
.system-screen {
  min-height: 100dvh;
  display: flex; align-items: center; justify-content: center;
  background: var(--color-bg-neutral);
  font-family: var(--font-body);
  color: var(--color-text-primary);
  padding: var(--space-xl);
  text-align: center;
}
.system-screen__inner {
  max-width: 360px;
  display: flex; flex-direction: column; align-items: center;
  gap: var(--space-md);
}
.system-screen__title {
  font-family: var(--font-display);
  font-size: var(--text-h1);
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: -0.01em;
  color: var(--color-text-primary);
  text-wrap: balance;
}
.system-screen__body {
  font-family: var(--font-display);
  font-style: italic;
  font-size: var(--text-body-lg);
  line-height: 1.55;
  color: var(--color-text-secondary);
  text-wrap: balance;
}
.system-screen__action {
  margin-top: var(--space-md);
}
.system-screen .system-btn {
  min-height: 52px;
  padding: var(--space-md) var(--space-xl);
  background: var(--color-mineral); color: #fff;
  font-family: var(--font-body); font-weight: 600;
  font-size: var(--text-body-lg);
  border: 0; border-radius: var(--radius-lg);
  cursor: pointer; text-decoration: none;
  display: inline-flex; align-items: center; justify-content: center;
  box-shadow: var(--shadow-mineral);
  transition: background var(--duration-micro) var(--ease-essence);
}
.system-screen .system-btn:hover { background: var(--color-mineral-dark); }
.system-screen .system-btn:focus-visible {
  outline: none;
  box-shadow: var(--shadow-mineral), 0 0 0 4px rgba(122, 128, 136, 0.18);
}
`;
