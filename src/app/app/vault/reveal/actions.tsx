'use client';

import { useRouter } from 'next/navigation';
import { VaultRevealScreen } from '@/components/screens/vault/VaultRevealScreen';

export function RevealActions() {
  const router = useRouter();
  return <VaultRevealScreen onAdvance={() => router.push('/app/vault/protect')} />;
}
