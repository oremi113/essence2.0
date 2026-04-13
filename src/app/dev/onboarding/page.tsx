'use client';

import { useCallback, useState } from 'react';
import { OnboardingScreen } from '@/components/screens/OnboardingScreen';
import type { OnboardingScreenData } from '@/components/screens/OnboardingScreen.types';

/**
 * Onboarding dev sandbox — permanent gallery entry, no auth required.
 *
 * `onComplete` is stubbed: logs the captured data, waits briefly so
 * the user can see the "loading" state, shows a confirmation alert, then
 * bumps a key so the component re-mounts and the flow resets to screen 1.
 */
export default function OnboardingDevPage() {
  const [runId, setRunId] = useState(0);

  const mockComplete = useCallback(
    async (
      firstName: string,
      lastName: string,
      dob: string,
      city: string,
      stateCode: string,
      hasPhoto: boolean
    ) => {
      console.log('[dev/onboarding] mock onComplete:', {
        firstName,
        lastName,
        dob,
        city,
        stateCode,
        hasPhoto,
      });
      await new Promise((resolve) => setTimeout(resolve, 900));
      alert(
        [
          'Mock complete.',
          '',
          `name:  ${firstName} ${lastName}`,
          `dob:   ${dob}`,
          `city:  ${city}, ${stateCode}`,
          `photo: ${hasPhoto ? 'added' : 'skipped'}`,
          '',
          'In production this writes to profiles and redirects to /app/record.',
          'Restarting the flow from screen 1.',
        ].join('\n')
      );
      setRunId((id) => id + 1);
    },
    []
  );

  const data: OnboardingScreenData = {
    firstName: null,
    lastName: null,
    dateOfBirth: null,
    city: null,
    state: null,
    isCompleted: false,
  };

  return <OnboardingScreen key={runId} data={data} onComplete={mockComplete} />;
}
