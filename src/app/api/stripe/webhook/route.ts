import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe/client';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import type { BillingPlan } from '@/lib/vault';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  if (!webhookSecret) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET not set');
    return NextResponse.json({ error: 'Webhook secret missing' }, { status: 500 });
  }

  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('[stripe-webhook] Signature verification failed', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        await handleSubscriptionChange(event.data.object as Stripe.Subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      }
      case 'invoice.payment_failed': {
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      }
      default:
        console.log(`[stripe-webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`[stripe-webhook] Error processing ${event.type}`, err);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (!session.subscription || !session.customer || !session.metadata?.user_id) {
    console.error(
      '[stripe-webhook] checkout.session.completed missing required fields',
      session.id,
    );
    return;
  }

  const subscriptionId =
    typeof session.subscription === 'string' ? session.subscription : session.subscription.id;

  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const plan = (session.metadata.billing_period as BillingPlan | undefined) ?? 'monthly';
  await upsertSubscription(sub, session.metadata.user_id, plan);

  // NOTE: Session 7c spec called for a voice-processing trigger here
  // (flip voice_profiles.status from 'collecting' to 'processing' on paid
  // checkout). Removed before shipping because this codebase's 'processing'
  // status semantically means "ElevenLabs is currently running" — flipping
  // it without actually invoking /api/voice-profiles/[id]/start would leave
  // the profile stuck and trip the staleness check in that route. Whether
  // /start should gate on payment at all is a separate product question,
  // not a webhook concern. Do not re-add this trigger without resolving
  // the semantic gap first.
}

async function handleSubscriptionChange(sub: Stripe.Subscription) {
  const userId = sub.metadata.user_id;
  const billingPeriod = (sub.metadata.billing_period as BillingPlan | undefined) ?? 'monthly';

  if (!userId) {
    console.error('[stripe-webhook] subscription missing user_id metadata', sub.id);
    return;
  }

  await upsertSubscription(sub, userId, billingPeriod);
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  // Stripe fires customer.subscription.deleted for BOTH retry-exhaustion
  // lapses and voluntary cancellations. Distinguish via
  // cancellation_details.reason so the restore screen + analytics can
  // tell a pause from a choice.
  const reason = sub.cancellation_details?.reason;
  const status: 'lapsed' | 'cancelled' = reason === 'payment_failed' ? 'lapsed' : 'cancelled';

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status,
      cancelled_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', sub.id);

  if (error) {
    console.error('[stripe-webhook] Failed to mark deleted', error);
    throw error;
  }

  console.log(
    `[stripe-webhook] subscription deleted, status=${status}, reason=${reason ?? 'unknown'}, sub ${sub.id}`,
  );
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // In API 2026-03-25.dahlia the subscription ref moved to
  // invoice.parent.subscription_details.subscription.
  const subRef =
    invoice.parent?.type === 'subscription_details'
      ? invoice.parent.subscription_details?.subscription
      : null;

  if (!subRef) {
    console.warn('[stripe-webhook] invoice.payment_failed missing subscription id', invoice.id);
    return;
  }

  const subscriptionId = typeof subRef === 'string' ? subRef : subRef.id;
  const attemptCount = invoice.attempt_count ?? 0;

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'past_due',
      last_failed_attempt_count: attemptCount,
    })
    .eq('stripe_subscription_id', subscriptionId);

  if (error) {
    console.error('[stripe-webhook] Failed to mark past_due', error);
    throw error;
  }

  console.log(
    `[stripe-webhook] marked past_due, attempt ${attemptCount}, sub ${subscriptionId}`,
  );
}

async function upsertSubscription(
  sub: Stripe.Subscription,
  userId: string,
  billingPeriod: BillingPlan,
) {
  let status: 'trial' | 'active' | 'past_due' | 'lapsed' | 'cancelled';

  switch (sub.status) {
    case 'trialing':
      status = 'trial';
      break;
    case 'active':
      status = 'active';
      break;
    case 'past_due':
    case 'unpaid':
      status = 'past_due';
      break;
    case 'canceled':
      status = 'cancelled';
      break;
    case 'incomplete':
    case 'incomplete_expired':
      status = 'lapsed';
      break;
    default:
      status = 'lapsed';
  }

  const priceItem = sub.items.data[0];
  const priceId = priceItem?.price.id ?? '';
  const priceAmountCents = priceItem?.price.unit_amount ?? 0;
  const currency = priceItem?.price.currency ?? 'usd';
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;

  // In API 2026-03-25.dahlia, period timestamps live on the subscription item.
  const periodStart = priceItem?.current_period_start ?? null;
  const periodEnd = priceItem?.current_period_end ?? null;

  const row = {
    user_id: userId,
    stripe_subscription_id: sub.id,
    stripe_customer_id: customerId,
    stripe_price_id: priceId,
    price_amount_cents: priceAmountCents,
    currency,
    status,
    billing_period: billingPeriod,
    trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
    current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: sub.cancel_at_period_end,
  };

  const supabase = createSupabaseServiceClient();

  // Defense in depth: ensure the FK target exists before the subscriptions
  // upsert. createCheckoutSession validates profile existence at the gate,
  // but this self-heals for edge paths (manual event replay, race during
  // backfill, future code that bypasses the server-action flow).
  const { error: profileEnsureError } = await supabase
    .from('profiles')
    .upsert(
      { user_id: userId },
      { onConflict: 'user_id', ignoreDuplicates: true },
    );

  if (profileEnsureError) {
    console.error('[stripe-webhook] profile ensure failed', profileEnsureError);
    throw profileEnsureError;
  }

  const { error } = await supabase
    .from('subscriptions')
    .upsert(row, { onConflict: 'stripe_subscription_id' });

  if (error) {
    console.error('[stripe-webhook] Upsert failed', error);
    throw error;
  }
}
