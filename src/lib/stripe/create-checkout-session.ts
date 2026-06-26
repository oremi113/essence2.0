import 'server-only';
import { stripe } from './client';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { BillingPlan } from '@/lib/vault';

export interface CreateCheckoutSessionResult {
  checkoutUrl: string;
}

export type CreateCheckoutSessionErrorCode =
  | 'unauthenticated'
  | 'profile_missing'
  | 'profile_lookup_failed'
  | 'missing_price_id'
  | 'stripe_error';

export async function createCheckoutSession(
  plan: BillingPlan,
): Promise<CreateCheckoutSessionResult> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw Object.assign(new Error('User not authenticated'), {
      code: 'unauthenticated' satisfies CreateCheckoutSessionErrorCode,
    });
  }

  // Fail loudly BEFORE any Stripe call if the user has no profile row.
  // Without this, the webhook's subscriptions insert would FK-fail post-charge.
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileError) {
    console.error('[createCheckoutSession] profile lookup failed', profileError);
    throw Object.assign(new Error('Profile lookup failed'), {
      code: 'profile_lookup_failed' satisfies CreateCheckoutSessionErrorCode,
    });
  }

  if (!profile) {
    console.error(
      '[createCheckoutSession] missing profile row for authenticated user',
      user.id,
    );
    throw Object.assign(
      new Error('Account setup incomplete. Please contact support.'),
      { code: 'profile_missing' satisfies CreateCheckoutSessionErrorCode },
    );
  }

  let customerId = profile.stripe_customer_id as string | null | undefined;

  // The stored customer ID can go stale if the customer was deleted in
  // Stripe (dashboard cleanup, support action). Validate before using —
  // if missing, fall through to create a fresh one and re-sync the profile.
  if (customerId) {
    try {
      const existing = await stripe.customers.retrieve(customerId);
      if ((existing as { deleted?: boolean }).deleted) {
        customerId = null;
      }
    } catch (err) {
      if ((err as { code?: string }).code === 'resource_missing') {
        customerId = null;
      } else {
        throw err;
      }
    }
  }

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;

    // Persist the new customer id BEFORE checkout. If this write silently
    // failed the id would stay null in profiles, and the next checkout would
    // create a *second* Stripe customer — splintering the user's billing
    // history. Match the lookup's loud-failure pattern: abort rather than leak
    // a duplicate-customer path. (FOLLOW_UPS #44)
    const { error: persistError } = await supabase
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('user_id', user.id);

    if (persistError) {
      console.error(
        '[createCheckoutSession] failed to persist stripe_customer_id',
        persistError,
      );
      throw Object.assign(new Error('Failed to persist Stripe customer'), {
        code: 'profile_lookup_failed' satisfies CreateCheckoutSessionErrorCode,
      });
    }
  }

  const priceId =
    plan === 'annual'
      ? process.env.STRIPE_PRICE_ID_VAULT_ANNUAL
      : process.env.STRIPE_PRICE_ID_VAULT_MONTHLY;

  if (!priceId) {
    throw Object.assign(new Error(`Missing Stripe price ID for ${plan}`), {
      code: 'missing_price_id' satisfies CreateCheckoutSessionErrorCode,
    });
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3100';

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 7,
      metadata: {
        user_id: user.id,
        billing_period: plan,
      },
    },
    success_url: `${origin}/app/vault/sealed?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/app/vault/protect?checkout=cancelled`,
    metadata: {
      user_id: user.id,
      billing_period: plan,
    },
  });

  if (!session.url) {
    throw Object.assign(new Error('Stripe did not return a checkout URL'), {
      code: 'stripe_error' satisfies CreateCheckoutSessionErrorCode,
    });
  }

  return { checkoutUrl: session.url };
}
