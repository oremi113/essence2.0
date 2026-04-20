import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
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

  // PLACEHOLDER_7b: If session_id is present, validate it with Stripe and
  // write subscription_status = 'trial' to profiles. Then kick off voice
  // processing. For 7a, we only accept users arriving via ?mock=true
  // (from the in-flow CTAs). Any other arrival routes back to the start.
  if (!params.mock && !params.session_id) {
    redirect('/app/vault/reveal');
  }

  return <SealedActions />;
}
