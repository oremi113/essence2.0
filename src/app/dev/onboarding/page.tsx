'use client';

import { useCallback, useState } from 'react';
import { OnboardingScreen } from '@/components/screens/OnboardingScreen';

/**
 * Onboarding dev sandbox — permanent gallery entry.
 * Lives at /dev/onboarding (top-level /dev/*), outside middleware
 * protection, so it never requires auth.
 *
 * onComplete is stubbed: it does NOT write to the database and does
 * NOT redirect. It logs, waits 1.5s so the user can see Step 6
 * animating, shows a mock alert, and then increments a key prop to
 * remount the screen — bouncing the user back to Step 1 for another
 * run. This makes the sandbox a natural re-run loop, no refresh needed.
 */
export default function OnboardingDevPage() {
  const [runId, setRunId] = useState(0);

  const mockComplete = useCallback(async () => {
    console.log(
      '[dev/onboarding] mock onComplete — would POST /api/onboarding/complete and redirect to /app/record'
    );
    // Let the user see Step 6 breathe for a moment before the alert.
    await new Promise((resolve) => setTimeout(resolve, 1500));
    alert(
      'Mock complete.\n\nIn production this writes onboarding_completed_at and redirects to /app/record.\n\nRestarting the flow from Step 1.'
    );
    // Bumping the key remounts OnboardingScreen, resetting internal
    // state (step, openAccordion, timers, etc.) back to Step 1.
    setRunId((id) => id + 1);
  }, []);

  return <OnboardingScreen key={runId} onComplete={mockComplete} />;
}
