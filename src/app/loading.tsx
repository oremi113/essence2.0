/**
 * App-wide route-transition loading state (Step 10 — System States). A quiet
 * warm hold — a single soft pulse — rather than a busy spinner. Shown while a
 * route segment streams in.
 */
export default function Loading() {
  return (
    <div className="app-loading" aria-label="Loading" role="status">
      <style>{`
        .app-loading {
          min-height: 100dvh;
          display: flex; align-items: center; justify-content: center;
          background: var(--color-bg-neutral);
        }
        .app-loading__dot {
          width: 12px; height: 12px;
          border-radius: var(--radius-full);
          background: var(--color-mineral);
          animation: app-loading-pulse 1.4s var(--ease-essence) infinite;
        }
        @keyframes app-loading-pulse {
          0%, 100% { opacity: 0.35; transform: scale(0.85); }
          50%      { opacity: 0.9;  transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .app-loading__dot { animation: none; opacity: 0.6; }
        }
      `}</style>
      <div className="app-loading__dot" />
    </div>
  );
}
