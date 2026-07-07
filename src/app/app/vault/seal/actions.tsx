'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { VaultSealScreen } from '@/components/screens/vault/VaultSealScreen';
import type { BillingPlan } from '@/lib/vault';
import { ROUTES } from '@/lib/routes';
import { useCheckout } from '@/lib/stripe/useCheckout';

export function SealActions({ billingPlan }: { billingPlan: BillingPlan }) {
  const router = useRouter();
  const checkout = useCheckout('seal');
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutFailed, setCheckoutFailed] = useState(false);

  const handleCheckout = async (plan: BillingPlan) => {
    if (isProcessing) return;
    setCheckoutFailed(false);
    setIsProcessing(true);
    const handled = await checkout(plan);
    // handled: navigation is underway, this component unmounts. Otherwise the
    // request failed — re-enable the CTA and show a recoverable error.
    if (!handled) {
      setCheckoutFailed(true);
      setIsProcessing(false);
    }
  };

  // was '/app/home' — a non-existent route that 404s; home is '/home'.
  // Fixed via the central route map. See FOLLOW_UPS #34.
  const handleDismiss = () => router.push(ROUTES.home);

  return (
    <VaultSealScreen
      billingPlan={billingPlan}
      onCheckoutInitiate={handleCheckout}
      onDismiss={handleDismiss}
      isProcessing={isProcessing}
      checkoutFailed={checkoutFailed}
    />
  );
}
