'use client';

import { useRouter } from 'next/navigation';
import { OnboardingScreen } from '@/components/screens/OnboardingScreen';
import type {
  OnboardingScreenData,
  OnCompleteOnboarding,
} from '@/components/screens/OnboardingScreen.types';

/**
 * Thin client wrapper. Holds the router (navigates to /app/record after
 * the server action resolves).
 *
 * The server action itself is defined in page.tsx and passed as a prop.
 * OnboardingScreen never imports Supabase, and this wrapper never touches
 * /api/* — layers stay clean.
 */
export function OnboardingPageClient({
  data,
  onComplete,
}: {
  data: OnboardingScreenData;
  onComplete: OnCompleteOnboarding;
}) {
  const router = useRouter();

  async function handleComplete(
    firstName: string,
    lastName: string,
    dateOfBirth: string,
    city: string,
    stateCode: string,
    hasPhoto: boolean
  ) {
    await onComplete(firstName, lastName, dateOfBirth, city, stateCode, hasPhoto);
    router.push('/app/record');
  }

  return <OnboardingScreen data={data} onComplete={handleComplete} />;
}
