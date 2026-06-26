'use client';

import { useRouter } from 'next/navigation';
import { OnboardingScreen } from '@/components/screens/OnboardingScreen';
import type {
  OnboardingScreenData,
  OnCompleteOnboarding,
  OnUploadAvatar,
} from '@/components/screens/OnboardingScreen.types';
import { ROUTES } from '@/lib/routes';

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
    // If the save fails, onComplete rejects — we deliberately let that bubble
    // (the push below is skipped) so OnboardingScreen catches it and shows the
    // retry-in-place error instead of navigating away on a silent failure
    // (FOLLOW_UPS #42). Navigation only happens on a confirmed save.
    await onComplete(firstName, lastName, dateOfBirth, city, stateCode);
    router.push(ROUTES.record);
  }

  return (
    <OnboardingScreen
      data={data}
      onComplete={handleComplete}
      onUploadAvatar={onUploadAvatar}
    />
  );
}
