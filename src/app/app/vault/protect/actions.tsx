'use client';

import { useRouter } from 'next/navigation';
import { VaultProtectScreen } from '@/components/screens/vault/VaultProtectScreen';
import type { BillingPlan } from '@/lib/vault';

export function ProtectActions() {
  const router = useRouter();

  const handleCheckout = (plan: BillingPlan) => {
    // PLACEHOLDER_7b: POST to /api/stripe/create-checkout-session and
    // redirect to the returned Stripe Checkout URL. For 7a we route
    // directly to the mock sealed screen.
    router.push(`/app/vault/sealed?mock=true&plan=${plan}`);
  };

  const handleDismiss = () => router.push('/app/vault/continuity');

  return (
    <VaultProtectScreen
      onCheckoutInitiate={handleCheckout}
      onDismiss={handleDismiss}
    />
  );
}
