import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
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

  // PLACEHOLDER_7b: subscription_status route guard — see reveal/page.tsx.

  const params = await searchParams;
  const plan: BillingPlan = params.plan === 'monthly' ? 'monthly' : 'annual';

  return <SealActions billingPlan={plan} />;
}
