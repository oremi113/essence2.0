'use client';

import { useRouter } from 'next/navigation';
import { VaultSealedScreen } from '@/components/screens/vault/VaultSealedScreen';

export function SealedActions() {
  const router = useRouter();
  return (
    <VaultSealedScreen
      onCreateMessage={() => router.push('/app/messages/new')}
      onGoHome={() => router.push('/app/record')}
    />
  );
}
