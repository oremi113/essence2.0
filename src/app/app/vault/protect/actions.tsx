'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { VaultProtectScreen } from '@/components/screens/vault/VaultProtectScreen';
import type { BillingPlan } from '@/lib/vault';
import { ROUTES, vaultContinuityWithPlan } from '@/lib/routes';
import { useCheckout } from '@/lib/stripe/useCheckout';

function readPlan(params: URLSearchParams): BillingPlan {
  return params.get('plan') === 'monthly' ? 'monthly' : 'annual';
}

export function ProtectActions() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = readPlan(new URLSearchParams(searchParams.toString()));
  const handleCheckout = useCheckout('protect');

  const handlePlanChange = (next: BillingPlan) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('plan', next);
    router.replace(`${ROUTES.vaultProtect}?${params.toString()}`, { scroll: false });
  };

  const handleDismiss = () => {
    router.push(vaultContinuityWithPlan(plan));
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
