import { redirect } from 'next/navigation';
import { ROUTES } from '@/lib/routes';

// Spine-wiring S4: the old vault subscribe arc is retired — the post-payment beat
// is now /app/voice/processing (S2). URL kept as a stable forward to Home
// (DECISIONS lock). Stripe success_url + the mock URL were repointed to
// processing in S2b, so nothing lands here anymore.
export default function VaultSealedPage() {
  redirect(ROUTES.home);
}
