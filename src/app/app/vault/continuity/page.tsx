import { redirect } from 'next/navigation';
import { ROUTES } from '@/lib/routes';

// Spine-wiring S4: the old vault subscribe arc (reveal→protect→continuity→seal→
// sealed) is retired — Card Capture (S1) + Processing (S2) replaced it. This URL
// is kept as a stable forward to Home rather than 404'd (DECISIONS lock: URLs
// don't change during a redesign).
export default function VaultContinuityPage() {
  redirect(ROUTES.home);
}
