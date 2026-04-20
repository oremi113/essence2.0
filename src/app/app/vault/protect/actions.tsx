'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { VaultProtectScreen } from '@/components/screens/vault/VaultProtectScreen';
import type { BillingPlan } from '@/lib/vault';

function readPlan(params: URLSearchParams): BillingPlan {
  return params.get('plan') === 'monthly' ? 'monthly' : 'annual';
}

export function ProtectActions() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = readPlan(new URLSearchParams(searchParams.toString()));

  const handlePlanChange = (next: BillingPlan) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('plan', next);
    router.replace(`/app/vault/protect?${params.toString()}`, { scroll: false });
  };

  const handleCheckout = async (selected: BillingPlan) => {
    const res = await fetch('/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: selected }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data?.redirect) {
        router.push(data.redirect);
        return;
      }
      console.error('[protect] checkout failed', data);
      return;
    }

    const { checkoutUrl } = (await res.json()) as { checkoutUrl: string };

    // External Stripe URL: use a full page navigation. Internal mock path:
    // router.push keeps the SPA nav.
    if (/^https?:\/\//.test(checkoutUrl)) {
      window.location.assign(checkoutUrl);
    } else {
      router.push(checkoutUrl);
    }
  };

  const handleDismiss = () => {
    router.push(`/app/vault/continuity?plan=${plan}`);
  };

  return (
    <VaultProtectScreen
      plan={plan}
      onPlanChange={handlePlanChange}
      onCheckoutInitiate={handleCheckout}
      onDismiss={handleDismiss}
    />
  );
}
