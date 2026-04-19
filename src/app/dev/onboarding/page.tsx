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
 *
 * `onUploadAvatar` is stubbed: returns a local object URL so the photo
 * screen + review card render the just-picked image without hitting
 * Supabase. Useful for previewing the visual flow without setting up
 * Storage locally.
 */
export default function OnboardingDevPage() {
  const [runId, setRunId] = useState(0);

  const mockComplete = useCallback(
    async (
      firstName: string,
      lastName: string,
      dob: string,
      city: string,
      stateCode: string
    ) => {
      console.log('[dev/onboarding] mock onComplete:', {
        firstName,
        lastName,
        dob,
        city,
        stateCode,
      });
      await new Promise((resolve) => setTimeout(resolve, 900));
      alert(
        [
          'Mock complete.',
          '',
          `name:  ${firstName} ${lastName}`,
          `dob:   ${dob}`,
          `city:  ${city}, ${stateCode}`,
          '',
          'In production this writes to profiles and redirects to /app/record.',
          'Restarting the flow from screen 1.',
        ].join('\n')
      );
      setRunId((id) => id + 1);
    },
    []
  );

  const mockUpload = useCallback(async (formData: FormData) => {
    const file = formData.get('file');
    if (!(file instanceof File)) throw new Error('No file');
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { avatarUrl: URL.createObjectURL(file) };
  }, []);

  const data: OnboardingScreenData = {
    firstName: null,
    lastName: null,
    dateOfBirth: null,
    city: null,
    state: null,
    avatarUrl: null,
    isCompleted: false,
  };

  return (
    <OnboardingScreen
      key={runId}
      data={data}
      onComplete={mockComplete}
      onUploadAvatar={mockUpload}
    />
  );
}
