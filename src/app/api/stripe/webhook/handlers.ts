import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe/client';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import type { BillingPlan } from '@/lib/vault';

export async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
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

export async function handleSubscriptionChange(sub: Stripe.Subscription) {
  const userId = sub.metadata.user_id;
  const billingPeriod = (sub.metadata.billing_period as BillingPlan | undefined) ?? 'monthly';

  if (!userId) {
    console.error('[stripe-webhook] subscription missing user_id metadata', sub.id);
    return;
  }

  await upsertSubscription(sub, userId, billingPeriod);
}

export async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  // Stripe fires customer.subscription.deleted for BOTH retry-exhaustion
  // lapses and voluntary cancellations. Distinguish via
  // cancellation_details.reason so the restore screen + analytics can
  // tell a pause from a choice.
  const reason = sub.cancellation_details?.reason;
  const status: 'lapsed' | 'cancelled' = reason === 'payment_failed' ? 'lapsed' : 'cancelled';

  const supabase = createSupabaseServiceClient();
  const { data: updated, error } = await supabase
    .from('subscriptions')
    .update({
      status,
      cancelled_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', sub.id)
    .select('id');

  if (error) {
    console.error('[stripe-webhook] Failed to mark deleted', error);
    throw error;
  }

  if (!updated || updated.length === 0) {
    // Out-of-order delivery: the delete arrived before the create/update that
    // would have inserted the row (or the id was never recorded). Surface it —
    // a silent no-op here would lose a lapse/cancellation. We can't synthesize
    // the row (NOT NULL price columns we don't have on a delete event), so warn.
    console.warn(
      `[stripe-webhook] subscription.deleted matched no row for ${sub.id} (out-of-order delete or unknown id, reason=${reason ?? 'unknown'})`,
    );
    return;
  }

  console.log(
    `[stripe-webhook] subscription deleted, status=${status}, reason=${reason ?? 'unknown'}, sub ${sub.id}`,
  );
}

export async function handlePaymentFailed(invoice: Stripe.Invoice) {
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
  const { data: updated, error } = await supabase
    .from('subscriptions')
    .update({
      status: 'past_due',
      last_failed_attempt_count: attemptCount,
    })
    .eq('stripe_subscription_id', subscriptionId)
    // Terminal-safe: never drag a lapsed/cancelled subscription back to
    // past_due if a stale invoice.payment_failed arrives after the delete.
    // The delete event is the terminal authority; this update only applies
    // while the subscription is still in a recoverable state.
    .in('status', ['trial', 'active', 'past_due'])
    .select('id');

  if (error) {
    console.error('[stripe-webhook] Failed to mark past_due', error);
    throw error;
  }

  if (!updated || updated.length === 0) {
    console.warn(
      `[stripe-webhook] invoice.payment_failed matched no recoverable row for ${subscriptionId} (already terminal, or id never recorded)`,
    );
    return;
  }

  console.log(
    `[stripe-webhook] marked past_due, attempt ${attemptCount}, sub ${subscriptionId}`,
  );
}

type DerivedStatus = 'trial' | 'active' | 'past_due' | 'lapsed' | 'cancelled';

// 'lapsed' and 'cancelled' are written only by handleSubscriptionDeleted, which
// is the terminal authority for a Stripe subscription id. Once a row reaches
// either, no created/updated event for the SAME id should move it (Stripe never
// reactivates a deleted subscription — a restore creates a brand-new id).
const TERMINAL_STATUSES: ReadonlySet<DerivedStatus> = new Set(['lapsed', 'cancelled']);

function deriveStatus(stripeStatus: Stripe.Subscription.Status): DerivedStatus {
  switch (stripeStatus) {
    case 'trialing':
      return 'trial';
    case 'active':
      return 'active';
    case 'past_due':
    case 'unpaid':
      return 'past_due';
    case 'canceled':
      return 'cancelled';
    case 'incomplete':
    case 'incomplete_expired':
      return 'lapsed';
    default:
      return 'lapsed';
  }
}

async function upsertSubscription(
  sub: Stripe.Subscription,
  userId: string,
  billingPeriod: BillingPlan,
) {
  const supabase = createSupabaseServiceClient();

  // Out-of-order / duplicate-delivery guard. Stripe does not guarantee event
  // ordering. If this id is already terminal, a late or replayed created/updated
  // event would resurrect a dead subscription — skip the write.
  const { data: existing, error: readError } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('stripe_subscription_id', sub.id)
    .maybeSingle();

  if (readError) {
    // Fail-open: a read failure must not drop a legitimate state write. Log and
    // proceed to the upsert (which is itself idempotent on stripe_subscription_id).
    console.error('[stripe-webhook] existing-status read failed', readError);
  } else if (existing && TERMINAL_STATUSES.has(existing.status as DerivedStatus)) {
    console.log(
      `[stripe-webhook] ignoring ${sub.status} event for already-terminal subscription ${sub.id} (status=${existing.status})`,
    );
    return;
  }

  const status = deriveStatus(sub.status);

  const priceItem = sub.items.data[0];
  const priceId = priceItem?.price.id ?? '';
  const priceAmountCents = priceItem?.price.unit_amount ?? 0;
  const currency = priceItem?.price.currency ?? 'usd';
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;

  // In API 2026-03-25.dahlia, period timestamps live on the subscription item.
  const periodStart = priceItem?.current_period_start ?? null;
  const periodEnd = priceItem?.current_period_end ?? null;

  const baseRow = {
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

  // Reset the dunning counter once the subscription resolves to a healthy
  // state (recovery from past_due, or a fresh trial). Omitted otherwise so a
  // prior invoice.payment_failed count survives a past_due upsert and keeps
  // driving the correct /app/record banner variant.
  const row =
    status === 'active' || status === 'trial'
      ? { ...baseRow, last_failed_attempt_count: 0 }
      : baseRow;

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
