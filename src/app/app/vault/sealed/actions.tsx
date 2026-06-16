'use client';

import { useRouter } from 'next/navigation';
import { VaultSealedScreen } from '@/components/screens/vault/VaultSealedScreen';
import { ROUTES } from '@/lib/routes';

export function SealedActions() {
  const router = useRouter();
  return (
    <VaultSealedScreen
      onCreateMessage={() => router.push(ROUTES.messagesNew)}
      onGoHome={() => router.push(ROUTES.record)}
    />
  );
}
