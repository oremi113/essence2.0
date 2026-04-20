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
    // Write the toggle to the URL so the choice survives refresh and
    // forwards through continuity → seal. `replace` avoids a history entry
    // per click; `scroll: false` keeps the card in place on mobile.
    const params = new URLSearchParams(searchParams.toString());
    params.set('plan', next);
    router.replace(`/app/vault/protect?${params.toString()}`, { scroll: false });
  };

  const handleCheckout = (selected: BillingPlan) => {
    // PLACEHOLDER_7b: POST to /api/stripe/create-checkout-session and
    // redirect to the returned Stripe Checkout URL. For 7a we route
    // directly to the mock sealed screen.
    router.push(`/app/vault/sealed?mock=true&plan=${selected}`);
  };

  const handleDismiss = () => {
    // Forward the current plan so the seal screen lands with the user's
    // actual choice (not the default).
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
