import type { SubscriptionStatus, BillingPlan } from '@/lib/vault';

/**
 * What the restore screen's CTA actually does, decided by subscription state:
 *
 * - `update_card` — the subscription still EXISTS (`past_due`, mid-retry). The
 *   fix is a Customer Portal card update; the next retry then succeeds and the
 *   webhook flips the row back to `active`.
 * - `restart` — the subscription is GONE (`lapsed`/`cancelled`; Stripe deleted
 *   it after retry exhaustion or a cancellation). A card update does nothing —
 *   Stripe never resurrects a deleted subscription. We must create a NEW one.
 *
 * See FOLLOW_UPS #23.
 */
export type RestoreMode = 'update_card' | 'restart';

export interface RestorePlan {
  mode: RestoreMode;
  /**
   * The plan to re-checkout on for a `restart`. Preserves the user's prior
   * cadence (a returning annual subscriber should not be silently dropped to
   * monthly), falling back to monthly only when no prior plan is known.
   * Unused for `update_card` (the Portal keeps the existing subscription).
   */
  plan: BillingPlan;
}

/**
 * The restore page only renders for `past_due | lapsed | cancelled` (the page
 * redirects `trial`/`active`/`none` away first). `past_due` keeps its
 * subscription, so it updates the card; everything else is terminal and
 * restarts. An unexpected non-terminal status defaults to `update_card` (the
 * conservative choice — it never creates a duplicate subscription).
 */
export function resolveRestorePlan(
  status: SubscriptionStatus,
  priorBillingPeriod: BillingPlan | null,
): RestorePlan {
  const plan: BillingPlan = priorBillingPeriod ?? 'monthly';
  const mode: RestoreMode = status === 'lapsed' || status === 'cancelled' ? 'restart' : 'update_card';
  return { mode, plan };
}
