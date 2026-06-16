'use client';

/**
 * App-wide runtime error boundary (Step 10 — System States). Catches errors in
 * any route below the root layout and offers a calm recovery, in the app's
 * voice. The root-layout-failure case is handled by global-error.tsx.
 */
import { useEffect } from 'react';
import { SystemScreen } from '@/components/system/SystemScreen';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface for observability; replace with real reporting when wired.
    console.error(error);
  }, [error]);

  return (
    <SystemScreen
      title="Something slipped on our end."
      body="Nothing is lost. Give it another try."
    >
      <button type="button" className="system-btn" onClick={() => reset()}>
        Try again
      </button>
    </SystemScreen>
  );
}
