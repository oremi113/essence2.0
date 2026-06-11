'use client';

import { useRouter } from 'next/navigation';
import { VaultRevealScreen } from '@/components/screens/vault/VaultRevealScreen';
import { ROUTES } from '@/lib/routes';

export function RevealActions() {
  const router = useRouter();
  return <VaultRevealScreen onAdvance={() => router.push(ROUTES.vaultProtect)} />;
}
