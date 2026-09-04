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
  | 'already_subscribed'
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

  // Trial-abuse guard (roadmap bucket #5). The 7-day trial is a one-time,
  // first-subscription benefit. The restore flow sends lapsed/cancelled users
  // back through THIS same checkout to restart, so without this gate every
  // restart would mint a fresh trial — a cancel-before-convert loop would be
  // perpetual free access. Grant the trial only to a user who has never held a
  // subscription of any kind. A returning subscriber is charged immediately.
  //
  // Keyed on user_id (stable) rather than the Stripe customer, so it survives a
  // customer-id reset from the stale-customer reconciliation above. RLS allows a
  // user to SELECT their own subscription rows, so the server client suffices.
  const { data: priorSub, error: priorSubError } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (priorSubError) {
    // Match the profile-lookup pattern: never guess the trial state. Abort and
    // let the caller retry rather than silently grant (re-opens abuse) or deny
    // (charges a legitimate first-timer on a transient blip).
    console.error(
      '[createCheckoutSession] prior-subscription lookup failed',
      priorSubError,
    );
    throw Object.assign(new Error('Subscription history lookup failed'), {
      code: 'profile_lookup_failed' satisfies CreateCheckoutSessionErrorCode,
    });
  }

  const grantTrial = !priorSub;

  // Duplicate-subscription guard (FOLLOW_UPS #77). Never mint a SECOND
  // subscription for a user who already holds a live one. The happy-path UI
  // prevents reaching here (reveal/protect redirect trial/active users to
  // /record; restore only restarts terminal states), so this backs a direct or
  // abnormal POST to the endpoint. Without it such a call creates a duplicate
  // Stripe subscription — double billing — and getSubscriptionStatus's
  // newest-row read would hide the older, still-charging one. Terminal statuses
  // (lapsed/cancelled) intentionally fall through: that IS the restore→restart
  // path, whose fresh trial is already gated by the guard above.
  const { data: liveSub, error: liveSubError } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', user.id)
    .in('status', ['trial', 'active', 'past_due'])
    .limit(1)
    .maybeSingle();

  if (liveSubError) {
    console.error(
      '[createCheckoutSession] live-subscription lookup failed',
      liveSubError,
    );
    throw Object.assign(new Error('Subscription lookup failed'), {
      code: 'profile_lookup_failed' satisfies CreateCheckoutSessionErrorCode,
    });
  }

  if (liveSub) {
    console.warn(
      '[createCheckoutSession] refusing duplicate checkout — user already has a live subscription',
      user.id,
    );
    throw Object.assign(new Error('You already have an active subscription.'), {
      code: 'already_subscribed' satisfies CreateCheckoutSessionErrorCode,
    });
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

  // Beta comp (STRIPE_BETA_COUPON_ID) — a 100%-off Stripe coupon applied to
  // every checkout while the flag is set. Beta testers walk the REAL Checkout
  // screen and enter a real card, and are charged $0. That's the point: the
  // mock checkout (VAULT_STRIPE_ENABLED off) skips Stripe entirely, so the
  // webhook, the subscription row, and the success_url reconcile never run
  // until launch day. This exercises all three at zero cost.
  //
  // `payment_method_collection: 'always'` is explicit rather than implied: with
  // a 100%-off coupon there is nothing to charge, and we still want the card on
  // file so the collect-and-store half of the flow is genuinely tested.
  //
  // UNSET THIS BEFORE CHARGING REAL MONEY. Leaving it set in a live-mode
  // environment comps every subscriber, forever.
  const betaCouponId = process.env.STRIPE_BETA_COUPON_ID?.trim() || undefined;

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    ...(betaCouponId
      ? {
          discounts: [{ coupon: betaCouponId }],
          payment_method_collection: 'always' as const,
        }
      : {}),
    subscription_data: {
      // First-timers only — see the trial-abuse guard above.
      ...(grantTrial ? { trial_period_days: 7 } : {}),
      metadata: {
        user_id: user.id,
        billing_period: plan,
      },
    },
    // The Checkout Session id rides along so the processing page can reconcile
    // the subscription row directly if it lands before the
    // `checkout.session.completed` webhook does (FOLLOW_UPS #84).
    success_url: `${origin}/app/voice/processing?session_id={CHECKOUT_SESSION_ID}`,
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
