'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { VaultSealedScreen } from '@/components/screens/vault/VaultSealedScreen';
import { ROUTES } from '@/lib/routes';
import { trackJourney, JOURNEY_EVENTS } from '@/lib/analytics/journey';

export function SealedActions({
  subscriptionStatus,
}: {
  /**
   * Present only on a real Stripe return (post-checkout). When set, this
   * landing is the subscription conversion moment and fires the funnel event;
   * its value is the resolved status ('trial' | 'active') or 'pending' when
   * the webhook hasn't written the row yet. Absent on mock/direct nav.
   */
  subscriptionStatus?: string;
}) {
  const router = useRouter();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current || !subscriptionStatus) return;
    fired.current = true;
    trackJourney(JOURNEY_EVENTS.subscriptionStarted, {
      subscription_status: subscriptionStatus,
    });
  }, [subscriptionStatus]);

  return (
    <VaultSealedScreen
      onCreateMessage={() => router.push(ROUTES.messagesNew)}
      onGoHome={() => router.push(ROUTES.record)}
    />
  );
}
