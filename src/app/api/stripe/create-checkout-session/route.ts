import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createCheckoutSession } from '@/lib/stripe/create-checkout-session';
import { isFeatureEnabled } from '@/lib/feature-flags';
import type { BillingPlan } from '@/lib/vault';
import { ROUTES, signInWithNext } from '@/lib/routes';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const plan = body?.plan as BillingPlan | undefined;

  if (plan !== 'monthly' && plan !== 'annual') {
    return NextResponse.json(
      { error: 'Invalid plan. Must be "monthly" or "annual".' },
      { status: 400 },
    );
  }

  // Mock path — stands in for a successful checkout while VAULT_STRIPE_ENABLED is
  // off. Spine-wiring S2b: lands on the processing beat (was the old sealed
  // screen). The mock writes no subscription, so processing honours `?mock=true`
  // as "paid" until real Stripe lands (S5).
  if (!isFeatureEnabled('VAULT_STRIPE_ENABLED')) {
    return NextResponse.json({
      checkoutUrl: `${ROUTES.voiceProcessing}?mock=true&plan=${plan}`,
    });
  }

  try {
    const result = await createCheckoutSession(plan);
    return NextResponse.json(result);
  } catch (err) {
    const code = (err as { code?: string }).code;

    if (code === 'unauthenticated') {
      return NextResponse.json(
        { error: 'Not authenticated', redirect: signInWithNext(ROUTES.vaultProtect) },
        { status: 401 },
      );
    }

    if (code === 'already_subscribed') {
      // 409 Conflict — the caller already has a live subscription. Not a
      // happy-path outcome (the UI routes subscribed users away); this backs a
      // direct/abnormal call so it never silently double-bills.
      return NextResponse.json(
        { error: 'You already have an active subscription.', code },
        { status: 409 },
      );
    }

    if (code === 'profile_missing' || code === 'profile_lookup_failed') {
      return NextResponse.json(
        { error: 'Account setup incomplete. Please contact support.', code },
        { status: 500 },
      );
    }

    console.error('[create-checkout-session]', err);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 },
    );
  }
}
