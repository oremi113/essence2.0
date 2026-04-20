'use client';

import { useRouter } from 'next/navigation';
import { VaultSealScreen } from '@/components/screens/vault/VaultSealScreen';
import type { BillingPlan } from '@/lib/vault';

export function SealActions({ billingPlan }: { billingPlan: BillingPlan }) {
  const router = useRouter();

  const handleCheckout = (plan: BillingPlan) => {
    // PLACEHOLDER_7b: POST to /api/stripe/create-checkout-session.
    router.push(`/app/vault/sealed?mock=true&plan=${plan}`);
  };

  const handleDismiss = () => router.push('/app/home');

  return (
    <VaultSealScreen
      billingPlan={billingPlan}
      onCheckoutInitiate={handleCheckout}
      onDismiss={handleDismiss}
    />
  );
}
