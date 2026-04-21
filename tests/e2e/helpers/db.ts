/**
 * Supabase REST helpers for test fixture setup. Uses the service-role key
 * to bypass RLS so tests can seed subscription state directly, without
 * driving real Stripe checkout.
 *
 * Only called from tests. Never imported into app code.
 */

export type SubscriptionStatus =
  | 'none'
  | 'trial'
  | 'active'
  | 'past_due'
  | 'lapsed'
  | 'cancelled';

export interface SubscriptionSeed {
  status: SubscriptionStatus;
  lastFailedAttemptCount?: number;
  billingPeriod?: 'monthly' | 'annual';
  priceAmountCents?: number;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  stripePriceId?: string;
}

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function headers() {
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Delete all subscription rows for the given user. Safe to run before any
 * scenario to ensure a clean slate.
 */
export async function clearSubscriptions(userId: string): Promise<void> {
  const url = env('NEXT_PUBLIC_SUPABASE_URL');
  const res = await fetch(
    `${url}/rest/v1/subscriptions?user_id=eq.${userId}`,
    { method: 'DELETE', headers: headers() },
  );
  if (!res.ok) throw new Error(`clearSubscriptions failed: ${res.status} ${await res.text()}`);
}

/**
 * Seed a subscription row for the given user. Overwrites any prior rows
 * (deletes first). Test-only; production writes go through the webhook.
 */
export async function seedSubscription(
  userId: string,
  seed: SubscriptionSeed,
): Promise<void> {
  await clearSubscriptions(userId);

  if (seed.status === 'none') return; // absent-row case

  const url = env('NEXT_PUBLIC_SUPABASE_URL');
  const now = new Date();
  const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Synthesize unique IDs per seed so concurrent tests don't collide.
  const uid = Math.random().toString(36).slice(2, 10);
  const row = {
    user_id: userId,
    stripe_subscription_id: seed.stripeSubscriptionId ?? `sub_test_${uid}`,
    stripe_customer_id: seed.stripeCustomerId ?? `cus_test_${uid}`,
    stripe_price_id: seed.stripePriceId ?? 'price_test_seed',
    price_amount_cents: seed.priceAmountCents ?? 1299,
    currency: 'usd',
    status: seed.status,
    billing_period: seed.billingPeriod ?? 'monthly',
    trial_ends_at: seed.status === 'trial' ? trialEnd.toISOString() : null,
    current_period_start: now.toISOString(),
    current_period_end: trialEnd.toISOString(),
    cancel_at_period_end: false,
    last_failed_attempt_count: seed.lastFailedAttemptCount ?? 0,
    cancelled_at: seed.status === 'lapsed' || seed.status === 'cancelled' ? now.toISOString() : null,
  };

  const res = await fetch(`${url}/rest/v1/subscriptions`, {
    method: 'POST',
    headers: { ...headers(), Prefer: 'return=representation' },
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`seedSubscription failed: ${res.status} ${await res.text()}`);
}

/**
 * Ensure the user's profile has a stripe_customer_id so Customer Portal
 * routes can be exercised without a full checkout. Pairs with seedSubscription.
 */
export async function setProfileCustomerId(userId: string, customerId: string | null): Promise<void> {
  const url = env('NEXT_PUBLIC_SUPABASE_URL');
  const res = await fetch(
    `${url}/rest/v1/profiles?user_id=eq.${userId}`,
    {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify({ stripe_customer_id: customerId }),
    },
  );
  if (!res.ok) throw new Error(`setProfileCustomerId failed: ${res.status} ${await res.text()}`);
}

/**
 * Delete all training clip rows for the user. For scenarios that verify
 * no-recordings vs has-recordings restore-screen copy.
 */
export async function clearTrainingClips(userId: string): Promise<void> {
  const url = env('NEXT_PUBLIC_SUPABASE_URL');
  const res = await fetch(
    `${url}/rest/v1/training_clips?user_id=eq.${userId}`,
    { method: 'DELETE', headers: headers() },
  );
  if (!res.ok) throw new Error(`clearTrainingClips failed: ${res.status} ${await res.text()}`);
}

/**
 * Read current subscription state for the user (most recent). Used by
 * assertions after a scenario to verify DB matches expectations.
 */
export async function getSubscription(userId: string) {
  const url = env('NEXT_PUBLIC_SUPABASE_URL');
  const res = await fetch(
    `${url}/rest/v1/subscriptions?user_id=eq.${userId}&order=created_at.desc&limit=1`,
    { headers: headers() },
  );
  if (!res.ok) throw new Error(`getSubscription failed: ${res.status} ${await res.text()}`);
  const rows = (await res.json()) as unknown[];
  return rows[0] ?? null;
}
