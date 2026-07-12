import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getOrCreateVoiceProfile } from '@/lib/profile';
import { getSubscriptionStatus } from '@/lib/subscription/get-status';
import { reconcileCheckoutSession } from '@/lib/stripe/reconcile-checkout-session';
import { isFeatureEnabled } from '@/lib/feature-flags';
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
//
// `?session_id=...` (real Stripe): the checkout `success_url` carries the
// Checkout Session id. Stripe redirects here the instant checkout completes —
// possibly BEFORE the `checkout.session.completed` webhook has written the trial
// row, so a just-paid user can read as `none`. Before treating `none` as unpaid,
// reconcile the row synchronously from the session (FOLLOW_UPS #84). Writing it
// here — during this server render — closes the race for BOTH this guard and the
// client-triggered `/start` entitlement guard, which reads the same row.
export default async function VoiceProcessingPage({
  searchParams,
}: {
  searchParams: Promise<{ mock?: string; session_id?: string }>;
}) {
  const { mock, session_id: sessionId } = await searchParams;
  const isMock = mock === 'true';

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(signInWithNext(ROUTES.voiceProcessing));

  if (!isMock) {
    let sub = await getSubscriptionStatus(user.id);

    // success_url vs webhook race (FOLLOW_UPS #84): reconcile from the
    // authoritative Checkout Session before falling back to the paywall. Only on
    // the real path (mock carries no session_id) and only when we'd otherwise
    // bounce a possibly-just-paid user.
    if (sub.status === 'none' && sessionId && isFeatureEnabled('VAULT_STRIPE_ENABLED')) {
      await reconcileCheckoutSession(sessionId, user.id);
      sub = await getSubscriptionStatus(user.id);
    }

    if (sub.status === 'none') redirect(ROUTES.vaultProtect);
    if (sub.status === 'lapsed' || sub.status === 'cancelled') redirect(ROUTES.vaultRestore);
  }

  const voiceProfile = await getOrCreateVoiceProfile();
  if (voiceProfile.status === 'ready') redirect(ROUTES.vaultReveal);

  return <ProcessingActions voiceProfileId={voiceProfile.id} />;
}
