import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSubscriptionStatus } from '@/lib/subscription/get-status';
import { SealedActions } from './actions';

export default async function VaultSealedPage({
  searchParams,
}: {
  searchParams: Promise<{ mock?: string; session_id?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/sign-in?next=/app/vault/sealed');

  const params = await searchParams;

  if (params.session_id) {
    // Real Stripe return: the browser usually beats the webhook back to our
    // server, so poll the subscriptions table for up to 3s waiting for the
    // row to land. Rendering anyway after the window protects the seal
    // animation from being blocked by webhook lag — 7c adds reconciliation
    // for the edge case where the webhook never fires.
    const maxAttempts = 6;
    for (let i = 0; i < maxAttempts; i++) {
      const sub = await getSubscriptionStatus(user.id);
      if (sub.status === 'trial' || sub.status === 'active') break;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  } else if (params.mock === 'true') {
    // 7a mock fallback (flag off). Render immediately, no DB check.
  } else {
    // Direct navigation — only allow if the user actually has a subscription.
    const sub = await getSubscriptionStatus(user.id);
    if (sub.status !== 'trial' && sub.status !== 'active') {
      redirect('/app/vault/reveal');
    }
  }

  return <SealedActions />;
}
