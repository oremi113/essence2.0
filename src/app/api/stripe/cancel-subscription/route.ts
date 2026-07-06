import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { ROUTES, signInWithNext } from '@/lib/routes';
import { logEvent, logError, generateRequestId } from '@/lib/logger';

/**
 * POST — cancel the authenticated user's live subscription at period end.
 *
 * `cancel_at_period_end: true` (not an immediate cancel) is what the copy
 * promises: "You'll keep access until <date>." The webhook
 * (`customer.subscription.updated`) persists the flag, and when the period ends
 * Stripe emits `customer.subscription.deleted` → the row flips to `cancelled`.
 * We never write the subscriptions table here (RLS: service-role only) — Stripe
 * is the source of truth and the webhook is the single writer.
 */
export async function POST() {
  const requestId = generateRequestId();

  if (!isFeatureEnabled('VAULT_STRIPE_ENABLED')) {
    return NextResponse.json({ ok: false, error: 'Stripe disabled' }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: 'Not authenticated', redirect: signInWithNext(ROUTES.settings) },
      { status: 401 },
    );
  }

  // Read the person's most-recent still-live subscription (RLS allows SELECT own).
  const { data: sub, error: subErr } = await supabase
    .from('subscriptions')
    .select('stripe_subscription_id, status')
    .eq('user_id', user.id)
    .in('status', ['trial', 'active', 'past_due'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subErr) {
    logError({ event: 'settings.cancel_subscription.lookup', requestId, userId: user.id, error: subErr });
    return NextResponse.json({ ok: false, error: 'Subscription lookup failed' }, { status: 500 });
  }
  if (!sub?.stripe_subscription_id) {
    return NextResponse.json({ ok: false, error: 'No active subscription found' }, { status: 404 });
  }

  try {
    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: true,
    });
    logEvent({ event: 'settings.cancel_subscription', requestId, userId: user.id, outcome: 'success' });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logError({ event: 'settings.cancel_subscription', requestId, userId: user.id, error: err });
    return NextResponse.json({ ok: false, error: 'Cancel failed' }, { status: 500 });
  }
}
