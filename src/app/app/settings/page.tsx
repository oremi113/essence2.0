import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { getSubscriptionStatus } from '@/lib/subscription/get-status';
import { getAvatarSignedUrl } from '@/lib/profile/avatar';
import { stripe } from '@/lib/stripe/client';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { VAULT_PRICING } from '@/lib/vault';
import { ROUTES, signInWithNext } from '@/lib/routes';
import type {
  CardSummary,
  SubscriptionData,
  SubscriptionStatus,
} from '@/components/screens/settings/SettingsScreen.types';
import { SettingsPageClient } from './SettingsPageClient';
import {
  changeEmailAction,
  removePhotoAction,
  deleteAccountAction,
  markTrustBandSeenAction,
} from './actions';

/**
 * Settings & Trust (Step 9). Thin data-shuttle: auth-guard, resolve the person's
 * email / photo / subscription / card, then render the client boundary. It owns
 * the cancel / update-card / delete / email-change side effects (via API routes
 * + the server actions imported below); the screen bubbles them out.
 */

function titleCaseBrand(brand: string): string {
  if (!brand) return brand;
  if (brand.toLowerCase() === 'amex') return 'Amex';
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

/** The card on file, read from Stripe (never stored in our DB). Null on any miss. */
async function getCardSummary(customerId: string): Promise<CardSummary | null> {
  try {
    const customer = await stripe.customers.retrieve(customerId, {
      expand: ['invoice_settings.default_payment_method'],
    });
    if ('deleted' in customer && customer.deleted) return null;
    const pm = customer.invoice_settings?.default_payment_method;
    if (pm && typeof pm !== 'string' && pm.card) {
      return { brand: titleCaseBrand(pm.card.brand), last4: pm.card.last4 };
    }
    const list = await stripe.paymentMethods.list({ customer: customerId, type: 'card', limit: 1 });
    const card = list.data[0]?.card;
    if (card) return { brand: titleCaseBrand(card.brand), last4: card.last4 };
    return null;
  } catch {
    return null;
  }
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ card_updated?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(signInWithNext(ROUTES.settings));
  }

  const { card_updated } = await searchParams;

  // A hard failure resolving the person's data renders the screen's calm
  // "Your messages are safe" + retry view (loadState='error') instead of falling
  // through to the generic app error boundary — this IS a trust surface. Most of
  // the helpers degrade rather than throw (getSubscriptionStatus → 'none',
  // getCardSummary → null), so this catches the catastrophic case (auth/session
  // /service-client failure). `onRetry` re-runs the server render via refresh().
  try {
    // Profile — avatar pointer + Stripe customer id + per-user UI latches.
    const { data: profile } = await supabase
      .from('profiles')
      .select('avatar_storage_bucket, avatar_storage_path, stripe_customer_id, ui_flags')
      .eq('user_id', user.id)
      .maybeSingle();

    // Trust band: full on first visit, slim on return (durable ui_flags latch).
    const uiFlags =
      profile?.ui_flags && typeof profile.ui_flags === 'object' && !Array.isArray(profile.ui_flags)
        ? (profile.ui_flags as Record<string, unknown>)
        : {};
    const trustBandSeen = uiFlags.settings_trust_seen === true;

    // Signed avatar URL (service client — the bucket is private). Null if no photo.
    const service = createSupabaseServiceClient();
    const photoUrl = await getAvatarSignedUrl(
      service,
      profile?.avatar_storage_bucket ?? null,
      profile?.avatar_storage_path ?? null,
    );

    // Subscription → the screen's calm data shape.
    const record = await getSubscriptionStatus(user.id);
    // `none` shouldn't reach Settings (the arc captures a card before processing);
    // fall back to trial so a stray state never renders an alarming plan card.
    const status: SubscriptionStatus = record.status === 'none' ? 'trial' : record.status;

    const card =
      isFeatureEnabled('VAULT_STRIPE_ENABLED') && profile?.stripe_customer_id
        ? await getCardSummary(profile.stripe_customer_id)
        : null;

    const subscription: SubscriptionData = {
      status,
      plan: record.billingPeriod ?? 'monthly',
      trialEndsAt: record.trialEndsAt,
      renewsAt: record.currentPeriodEnd,
      paidThroughAt: record.currentPeriodEnd,
      priceMonthlyCents: VAULT_PRICING.monthly.priceCents,
      priceAnnualCents: VAULT_PRICING.annual.priceCents,
      card,
    };

    return (
      <SettingsPageClient
        email={user.email ?? ''}
        photoUrl={photoUrl}
        subscription={subscription}
        notifications={{ trialReminders: true, paymentNotices: true }}
        cardUpdatedNotice={card_updated === '1'}
        trustBandSeen={trustBandSeen}
        deleteEnabled={isFeatureEnabled('ACCOUNT_DELETE_ENABLED')}
        changeEmailAction={changeEmailAction}
        removePhotoAction={removePhotoAction}
        deleteAccountAction={deleteAccountAction}
        markTrustBandSeenAction={markTrustBandSeenAction}
      />
    );
  } catch {
    return (
      <SettingsPageClient
        loadState="error"
        email={user.email ?? ''}
        photoUrl={null}
        subscription={EMPTY_SUBSCRIPTION}
        notifications={{ trialReminders: true, paymentNotices: true }}
        cardUpdatedNotice={false}
        deleteEnabled={false}
        changeEmailAction={changeEmailAction}
        removePhotoAction={removePhotoAction}
        deleteAccountAction={deleteAccountAction}
      />
    );
  }
}

/** Placeholder passed on the error path — the screen renders the error view,
 *  not the plan card, so these values are never shown. */
const EMPTY_SUBSCRIPTION: SubscriptionData = {
  status: 'trial',
  plan: 'monthly',
  trialEndsAt: null,
  renewsAt: null,
  paidThroughAt: null,
  priceMonthlyCents: VAULT_PRICING.monthly.priceCents,
  priceAnnualCents: VAULT_PRICING.annual.priceCents,
  card: null,
};
