import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { ROUTES, signInWithNext } from '@/lib/routes';

/**
 * POST — create a Stripe Customer Portal session for the authenticated user
 * and return its URL. Client opens the URL in a new tab.
 *
 * Prereq: the default Customer Portal configuration must exist in Stripe
 * Dashboard → Settings → Billing → Customer portal. Otherwise Stripe
 * returns "No such default configuration" and this route 500s.
 *
 * Optional JSON body `{ returnPath }` sets where Stripe returns the person on
 * finish (e.g. Settings passes `/app/settings?card_updated=1`). Only same-origin
 * absolute paths are honoured; anything else falls back to the restore arc.
 */
function safeReturnPath(raw: unknown): string {
  if (typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//')) {
    return raw;
  }
  return '/app/vault/restore';
}

export async function POST(request?: Request) {
  if (!isFeatureEnabled('VAULT_STRIPE_ENABLED')) {
    return NextResponse.json({ error: 'Stripe disabled' }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Not authenticated', redirect: signInWithNext(ROUTES.vaultRestore) },
      { status: 401 },
    );
  }

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileErr) {
    console.error('[portal-session] profile lookup failed', profileErr);
    return NextResponse.json({ error: 'Profile lookup failed' }, { status: 500 });
  }

  if (!profile?.stripe_customer_id) {
    console.error('[portal-session] no stripe_customer_id for user', user.id);
    return NextResponse.json({ error: 'No Stripe customer found' }, { status: 404 });
  }

  const body = request ? await request.json().catch(() => ({})) : {};
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3100';
  const returnUrl = `${baseUrl}${safeReturnPath((body as { returnPath?: unknown }).returnPath)}`;

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: returnUrl,
    });

    return NextResponse.json({ portalUrl: portalSession.url });
  } catch (err) {
    console.error('[portal-session] Stripe portal create failed', err);
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 },
    );
  }
}
