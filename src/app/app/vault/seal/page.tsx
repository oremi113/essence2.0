import { redirect } from 'next/navigation';
import { ROUTES } from '@/lib/routes';

// Spine-wiring S4: the old vault subscribe arc is retired — Card Capture (S1)
// replaced the seal step. URL kept as a stable forward to Home (DECISIONS lock).
export default function VaultSealPage() {
  redirect(ROUTES.home);
}
