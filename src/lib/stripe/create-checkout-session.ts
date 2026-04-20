import 'server-only';
import { stripe } from './client';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { BillingPlan } from '@/lib/vault';

export interface CreateCheckoutSessionResult {
  checkoutUrl: string;
}

export type CreateCheckoutSessionErrorCode =
  | 'unauthenticated'
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single();

  let customerId = profile?.stripe_customer_id as string | null | undefined;

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

    await supabase
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('user_id', user.id);
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
