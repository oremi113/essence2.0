'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { VaultContinuityScreen } from '@/components/screens/vault/VaultContinuityScreen';
import { vaultSealWithPlan } from '@/lib/routes';

export function ContinuityActions() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Continuity has no plan UI, but the param must survive the hop or the
  // seal screen falls back to the 'annual' default and the user's earlier
  // Monthly choice is silently overridden.
  const plan = searchParams.get('plan') === 'monthly' ? 'monthly' : 'annual';

  return (
    <VaultContinuityScreen
      onAdvance={() => router.push(vaultSealWithPlan(plan))}
    />
  );
}
