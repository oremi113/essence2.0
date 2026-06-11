'use client';

import { useRouter } from 'next/navigation';
import { VaultSealScreen } from '@/components/screens/vault/VaultSealScreen';
import type { BillingPlan } from '@/lib/vault';
import { ROUTES } from '@/lib/routes';

export function SealActions({ billingPlan }: { billingPlan: BillingPlan }) {
  const router = useRouter();

  const handleCheckout = async (plan: BillingPlan) => {
    const res = await fetch('/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data?.redirect) {
        router.push(data.redirect);
        return;
      }
      console.error('[seal] checkout failed', data);
      return;
    }

    const { checkoutUrl } = (await res.json()) as { checkoutUrl: string };

    if (/^https?:\/\//.test(checkoutUrl)) {
      window.location.assign(checkoutUrl);
    } else {
      router.push(checkoutUrl);
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
    />
  );
}
