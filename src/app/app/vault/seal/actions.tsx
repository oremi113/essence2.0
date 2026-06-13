'use client';

import { useRouter } from 'next/navigation';
import { VaultSealScreen } from '@/components/screens/vault/VaultSealScreen';
import type { BillingPlan } from '@/lib/vault';
import { ROUTES } from '@/lib/routes';
import { useCheckout } from '@/lib/stripe/useCheckout';

export function SealActions({ billingPlan }: { billingPlan: BillingPlan }) {
  const router = useRouter();
  const handleCheckout = useCheckout('seal');

  // was '/app/home' — a non-existent route that 404s; home is '/home'.
  // Fixed via the central route map. See FOLLOW_UPS #34.
  const handleDismiss = () => router.push(ROUTES.home);

  return (
    <VaultSealScreen
      billingPlan={billingPlan}
      onCheckoutInitiate={handleCheckout}
      onDismiss={handleDismiss}
    />
  );
}
