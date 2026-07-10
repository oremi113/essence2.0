'use client';

import { useRouter } from 'next/navigation';
import { VaultRevealScreen } from '@/components/screens/vault/VaultRevealScreen';
import { ROUTES } from '@/lib/routes';

export function RevealActions() {
  const router = useRouter();
  // Spine-wiring S3: the Reveal advances into the First Breath ceremony (first
  // playback), not back into the old vault arc. MASTER_SPEC §4.4 immutable rule 3:
  // Reveal before First Playback.
  return <VaultRevealScreen onAdvance={() => router.push(ROUTES.recordComplete)} />;
}
