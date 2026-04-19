'use client';

import { useRouter } from 'next/navigation';
import { OnboardingScreen } from '@/components/screens/OnboardingScreen';
import type {
  OnboardingScreenData,
  OnCompleteOnboarding,
  OnUploadAvatar,
} from '@/components/screens/OnboardingScreen.types';

/**
 * Thin client wrapper. Holds the router (navigates to /app/record after
 * the server action resolves).
 *
 * Server actions themselves are defined in page.tsx and passed as props.
 * OnboardingScreen never imports Supabase, and this wrapper never touches
 * /api/* — layers stay clean.
 */
export function OnboardingPageClient({
  data,
  onComplete,
  onUploadAvatar,
}: {
  data: OnboardingScreenData;
  onComplete: OnCompleteOnboarding;
  onUploadAvatar: OnUploadAvatar;
}) {
  const router = useRouter();

  async function handleComplete(
    firstName: string,
    lastName: string,
    dateOfBirth: string,
    city: string,
    stateCode: string
  ) {
    await onComplete(firstName, lastName, dateOfBirth, city, stateCode);
    router.push('/app/record');
  }

  return (
    <OnboardingScreen
      data={data}
      onComplete={handleComplete}
      onUploadAvatar={onUploadAvatar}
    />
  );
}
