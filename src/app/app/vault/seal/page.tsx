import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSubscriptionStatus } from '@/lib/subscription/get-status';
import { SealActions } from './actions';
import type { BillingPlan } from '@/lib/vault';

export default async function VaultSealPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/sign-in?next=/app/vault/seal');

  const sub = await getSubscriptionStatus(user.id);
  if (sub.status === 'trial' || sub.status === 'active') {
    redirect('/app/record');
  }
  if (sub.status === 'lapsed' || sub.status === 'cancelled') {
    redirect('/app/vault/restore');
  }

  const params = await searchParams;
  const plan: BillingPlan = params.plan === 'monthly' ? 'monthly' : 'annual';

  return <SealActions billingPlan={plan} />;
}
