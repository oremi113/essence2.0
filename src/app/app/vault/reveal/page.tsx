import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSubscriptionStatus } from '@/lib/subscription/get-status';
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
  // cancelled still route to restore. `none` renders too, transitionally: the
  // mock checkout (VAULT_STRIPE_ENABLED off) writes no subscription, so the walk
  // arrives here as `none`. S5 tightens this to `none → Card Capture` once real
  // Stripe subs exist.
  const sub = await getSubscriptionStatus(user.id);
  if (sub.status === 'lapsed' || sub.status === 'cancelled') {
    redirect(ROUTES.vaultRestore);
  }

  return <RevealActions />;
}
