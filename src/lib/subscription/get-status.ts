import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { SubscriptionStatus, BillingPlan } from '@/lib/vault';

export interface SubscriptionRecord {
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  billingPeriod: BillingPlan | null;
  cancelAtPeriodEnd: boolean;
  lastFailedAttemptCount: number;
}

export async function getSubscriptionStatus(userId: string): Promise<SubscriptionRecord> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('subscriptions')
    .select(
      'status, trial_ends_at, current_period_end, billing_period, cancel_at_period_end, last_failed_attempt_count',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return {
      status: 'none',
      trialEndsAt: null,
      currentPeriodEnd: null,
      billingPeriod: null,
      cancelAtPeriodEnd: false,
      lastFailedAttemptCount: 0,
    };
  }

  return {
    status: data.status as SubscriptionStatus,
    trialEndsAt: data.trial_ends_at,
    currentPeriodEnd: data.current_period_end,
    billingPeriod: data.billing_period as BillingPlan | null,
    cancelAtPeriodEnd: data.cancel_at_period_end,
    lastFailedAttemptCount: data.last_failed_attempt_count ?? 0,
  };
}
