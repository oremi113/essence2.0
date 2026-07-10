import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getOrCreateVoiceProfile } from '@/lib/profile';
import { getSubscriptionStatus } from '@/lib/subscription/get-status';
import { ProcessingActions } from './ProcessingActions';
import { ROUTES, signInWithNext } from '@/lib/routes';

// Step 3 · Processing — spine-wiring S2 (docs/session-stitch/spine-wiring-spec.md §4.3).
// The post-payment "we're creating your voice" wait. Voice creation (/start) is
// triggered from the client wrapper here — i.e. only AFTER payment, per the
// immutable journey order (MASTER_SPEC §4.4). The Card Capture commit lands here
// once S2b repoints the Stripe success_url (this chunk, S2a, adds the route).
//
// Guard: a user must have committed to reach this beat.
//   none                       → back to Card Capture (hasn't paid)
//   lapsed | cancelled         → restore
//   trial | active | past_due  → proceed; if the voice is already `ready`
//                                (refresh / returning), skip straight to the Reveal
//                                (first-run-only, decision 6.4).
//
// `?mock=true`: the mock checkout (VAULT_STRIPE_ENABLED off) writes no
// subscription, so a real trial doesn't exist yet — the mock stands in for
// "paid." Bypass the paid-guard for the mock path only. Removed when real Stripe
// lands (S5), where the webhook writes the trial before this page is reached.
export default async function VoiceProcessingPage({
  searchParams,
}: {
  searchParams: Promise<{ mock?: string }>;
}) {
  const { mock } = await searchParams;
  const isMock = mock === 'true';

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(signInWithNext(ROUTES.voiceProcessing));

  if (!isMock) {
    const sub = await getSubscriptionStatus(user.id);
    if (sub.status === 'none') redirect(ROUTES.vaultProtect);
    if (sub.status === 'lapsed' || sub.status === 'cancelled') redirect(ROUTES.vaultRestore);
  }

  const voiceProfile = await getOrCreateVoiceProfile();
  if (voiceProfile.status === 'ready') redirect(ROUTES.vaultReveal);

  return <ProcessingActions voiceProfileId={voiceProfile.id} />;
}
