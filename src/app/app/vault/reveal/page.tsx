import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { RevealActions } from './actions';

export default async function VaultRevealPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/sign-in?next=/app/vault/reveal');

  // PLACEHOLDER_7b: route guard redirects to /app/home when
  // profile.subscription_status is 'active' or 'trial'. That column lands
  // in 7b alongside the Stripe integration; for 7a the mocked checkout
  // doesn't persist anything, so there's no state to re-enter into.

  return <RevealActions />;
}
