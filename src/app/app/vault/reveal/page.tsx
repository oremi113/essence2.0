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

  const sub = await getSubscriptionStatus(user.id);
  if (sub.status === 'trial' || sub.status === 'active') {
    redirect(ROUTES.record);
  }
  if (sub.status === 'lapsed' || sub.status === 'cancelled') {
    redirect(ROUTES.vaultRestore);
  }

  return <RevealActions />;
}
