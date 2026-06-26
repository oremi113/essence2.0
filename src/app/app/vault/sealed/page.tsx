import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSubscriptionStatus } from '@/lib/subscription/get-status';
import { SealedActions } from './actions';
import { ROUTES, signInWithNext } from '@/lib/routes';

export default async function VaultSealedPage({
  searchParams,
}: {
  searchParams: Promise<{ mock?: string; session_id?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(signInWithNext(ROUTES.vaultSealed));

  const params = await searchParams;

  // Only a real Stripe return (session_id present) is a conversion worth a
  // subscription_started funnel event. On mock/direct nav we render the seal
  // but fire nothing.
  let subscriptionStatus: string | undefined;

  if (params.session_id) {
    // Real Stripe return: the browser usually beats the webhook back to our
    // server, so poll the subscriptions table for up to 3s waiting for the
    // row to land. Rendering anyway after the window protects the seal
    // animation from being blocked by webhook lag — 7c adds reconciliation
    // for the edge case where the webhook never fires.
    const maxAttempts = 6;
    subscriptionStatus = 'pending'; // webhook hasn't landed yet
    for (let i = 0; i < maxAttempts; i++) {
      const sub = await getSubscriptionStatus(user.id);
      if (sub.status === 'trial' || sub.status === 'active') {
        subscriptionStatus = sub.status;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  } else if (params.mock === 'true') {
    // 7a mock fallback (flag off). Render immediately, no DB check.
  } else {
    // Direct navigation — only allow if the user actually has a subscription.
    const sub = await getSubscriptionStatus(user.id);
    if (sub.status !== 'trial' && sub.status !== 'active') {
      redirect(ROUTES.vaultReveal);
    }
  }

  return <SealedActions subscriptionStatus={subscriptionStatus} />;
}
