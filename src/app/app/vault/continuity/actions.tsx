'use client';

import { useRouter } from 'next/navigation';
import { VaultContinuityScreen } from '@/components/screens/vault/VaultContinuityScreen';

export function ContinuityActions() {
  const router = useRouter();
  return (
    <VaultContinuityScreen onAdvance={() => router.push('/app/vault/seal')} />
  );
}
