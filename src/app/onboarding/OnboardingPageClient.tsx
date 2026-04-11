'use client';

import { useRouter } from 'next/navigation';
import { OnboardingScreen } from '@/components/screens/OnboardingScreen';

/**
 * Thin client wrapper that holds the side-effects:
 *   1. POST /api/onboarding/complete to write onboarding_completed_at
 *   2. router.push('/app/record') after success
 *
 * OnboardingScreen itself stays pure — it takes a Promise-returning
 * onComplete callback and never touches Supabase or /api/* directly.
 * This is the layer 2 / layer 3 boundary from the Session 3 contract.
 */
export function OnboardingPageClient() {
  const router = useRouter();

  async function handleComplete() {
    const res = await fetch('/api/onboarding/complete', { method: 'POST' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `HTTP ${res.status}`);
    }
    router.push('/app/record');
  }

  return <OnboardingScreen onComplete={handleComplete} />;
}
