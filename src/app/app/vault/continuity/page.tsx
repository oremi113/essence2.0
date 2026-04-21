import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSubscriptionStatus } from '@/lib/subscription/get-status';
import { ContinuityActions } from './actions';

export default async function VaultContinuityPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/sign-in?next=/app/vault/continuity');

  const sub = await getSubscriptionStatus(user.id);
  if (sub.status === 'trial' || sub.status === 'active') {
    redirect('/app/record');
  }
  if (sub.status === 'lapsed' || sub.status === 'cancelled') {
    redirect('/app/vault/restore');
  }

  return <ContinuityActions />;
}
