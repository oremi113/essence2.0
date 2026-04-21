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
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', sub.id);

  if (error) {
    console.error('[stripe-webhook] Failed to mark cancelled', error);
    throw error;
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // In API 2026-03-25.dahlia the subscription ref moved to
  // invoice.parent.subscription_details.subscription.
  const subRef = invoice.parent?.subscription_details?.subscription;
  if (!subRef) return;

  const subscriptionId = typeof subRef === 'string' ? subRef : subRef.id;

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from('subscriptions')
    .update({ status: 'past_due' })
    .eq('stripe_subscription_id', subscriptionId);

  if (error) {
    console.error('[stripe-webhook] Failed to mark past_due', error);
    throw error;
  }
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
