import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getOrCreateVoiceProfile } from '@/lib/profile';
import { getSubscriptionStatus } from '@/lib/subscription/get-status';
import { CardCaptureActions } from './CardCaptureActions';
import { ROUTES, signInWithNext } from '@/lib/routes';

// Step 3 · Card Capture — spine-wiring S1 (docs/session-stitch/spine-wiring-spec.md).
// This route now hosts the card-capture moment: the journey's first monetary ask,
// shown to `none` users (no card captured yet). It replaces the old five-screen
// vault arc's Protect screen; the leftover arc screens are retired in S4.
//
// Guard (spec §4.2 + decision 6.4, first-run-only) — inverted from the old arc,
// which bounced trial/active back to /record:
//   none                       → render CardCapture (the paywall)
//   trial | active | past_due  → already committed; forward to the hub, never
//                                back into the ask (first-run-only). Home routes
//                                onward (Home B when ready; the training stub
//                                until then). The processing/reveal routing for a
//                                just-paid, not-yet-ready user lands in S2/S3.
//   lapsed | cancelled         → restore
export default async function VaultProtectPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(signInWithNext(ROUTES.vaultProtect));

  const sub = await getSubscriptionStatus(user.id);
  if (sub.status === 'trial' || sub.status === 'active' || sub.status === 'past_due') {
    redirect(ROUTES.home);
  }
  if (sub.status === 'lapsed' || sub.status === 'cancelled') {
    redirect(ROUTES.vaultRestore);
  }

  // `none` — the card-capture paywall. A user here has recorded a reference clip,
  // so a voice profile exists; its id tags the held recording for the "not now"
  // park state (decision 6.2).
  const voiceProfile = await getOrCreateVoiceProfile();

  return <CardCaptureActions recordingId={voiceProfile.id} />;
}
