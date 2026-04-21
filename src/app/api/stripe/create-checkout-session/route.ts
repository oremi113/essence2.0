import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createCheckoutSession } from '@/lib/stripe/create-checkout-session';
import { isFeatureEnabled } from '@/lib/feature-flags';
import type { BillingPlan } from '@/lib/vault';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const plan = body?.plan as BillingPlan | undefined;

  if (plan !== 'monthly' && plan !== 'annual') {
    return NextResponse.json(
      { error: 'Invalid plan. Must be "monthly" or "annual".' },
      { status: 400 },
    );
  }

  // Mock path — preserves 7a behavior when the flag is off.
  if (!isFeatureEnabled('VAULT_STRIPE_ENABLED')) {
    return NextResponse.json({
      checkoutUrl: `/app/vault/sealed?mock=true&plan=${plan}`,
    });
  }

  try {
    const result = await createCheckoutSession(plan);
    return NextResponse.json(result);
  } catch (err) {
    const code = (err as { code?: string }).code;

    if (code === 'unauthenticated') {
      return NextResponse.json(
        { error: 'Not authenticated', redirect: `/auth/sign-in?next=/app/vault/protect` },
        { status: 401 },
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
