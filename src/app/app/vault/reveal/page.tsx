import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSubscriptionStatus } from '@/lib/subscription/get-status';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { RevealActions } from './actions';
import { ROUTES, signInWithNext } from '@/lib/routes';

export default async function VaultRevealPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(signInWithNext(ROUTES.vaultReveal));

  // Spine-wiring S3: the Reveal is now the post-payment payoff (reached from
  // processing), so a paid (trial/active) user must SEE it — the old pre-payment
  // arc bounced them to /record, which is wrong under the reorder. lapsed/
  // cancelled still route to restore.
  const sub = await getSubscriptionStatus(user.id);
  if (sub.status === 'lapsed' || sub.status === 'cancelled') {
    redirect(ROUTES.vaultRestore);
  }

  // `none` handling is live-Stripe-gated. With real Stripe on, reaching this
  // post-payment payoff as `none` means the user hasn't paid → Card Capture
  // paywall. While the flag is off, the mock walk legitimately arrives here as
  // `none` (the mock writes no subscription) and must render the Reveal.
  if (sub.status === 'none' && isFeatureEnabled('VAULT_STRIPE_ENABLED')) {
    redirect(ROUTES.vaultProtect);
  }

  return <RevealActions />;
}
