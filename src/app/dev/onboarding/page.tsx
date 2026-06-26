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
 *
 * The "simulate save failure" toggle makes `onComplete` throw so the
 * Screen 12 retry-in-place error UI (FOLLOW_UPS #42) can be exercised
 * without provoking a real DB/session error — pick the kind to preview
 * both copy variants (generic transient vs. session loss).
 */
export default function OnboardingDevPage() {
  const [runId, setRunId] = useState(0);
  const [failMode, setFailMode] = useState<'none' | 'transient' | 'session'>(
    'none'
  );

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
      if (failMode === 'transient') {
        throw new Error(
          'Could not save your onboarding details: simulated DB error'
        );
      }
      if (failMode === 'session') {
        throw new Error('Your session expired. Please sign in again.');
      }
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
    [failMode]
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
    <>
      <label
        style={{
          position: 'fixed',
          top: 8,
          right: 8,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 10px',
          background: 'rgba(0,0,0,0.7)',
          color: '#fff',
          fontFamily: 'monospace',
          fontSize: 12,
          borderRadius: 6,
        }}
      >
        dev · save:
        <select
          value={failMode}
          onChange={(e) =>
            setFailMode(e.target.value as 'none' | 'transient' | 'session')
          }
          style={{ fontFamily: 'monospace', fontSize: 12 }}
        >
          <option value="none">succeed</option>
          <option value="transient">fail (transient)</option>
          <option value="session">fail (session loss)</option>
        </select>
      </label>
      <OnboardingScreen
        key={runId}
        data={data}
        onComplete={mockComplete}
        onUploadAvatar={mockUpload}
      />
    </>
  );
}
