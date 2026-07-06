/**
 * Mock data for the Settings & Trust dev sandbox (/dev/settings) and unit tests.
 * One factory per subscription state so the dev rail can exercise every plan
 * variant, the system views, the sheets, and the delete flow with realistic
 * props. Dates are fixed absolute strings (no `Date.now()`), so the rendered
 * copy is deterministic across runs.
 */
import type {
  NotificationSettings,
  SettingsScreenProps,
  SubscriptionData,
  SubscriptionStatus,
} from './SettingsScreen.types';

const CARD = { brand: 'Visa', last4: '4242' } as const;

const PRICES = {
  priceMonthlyCents: 1299, // "$12.99 a month"
  priceAnnualCents: 11900, // "$119 a year"
} as const;

const NOTIF: NotificationSettings = { trialReminders: true, paymentNotices: true };

/** A subscription block for each state, with the dates the copy reads back. */
export function mockSubscription(status: SubscriptionStatus): SubscriptionData {
  const base: SubscriptionData = {
    status,
    plan: 'monthly',
    trialEndsAt: null,
    renewsAt: null,
    paidThroughAt: null,
    card: CARD,
    ...PRICES,
  };
  switch (status) {
    case 'trial':
      return { ...base, trialEndsAt: '2026-06-14' };
    case 'active':
      return { ...base, renewsAt: '2026-07-14' };
    case 'past_due':
      return { ...base, renewsAt: '2026-07-14' };
    case 'lapsed':
      return { ...base, card: null };
    case 'cancelled':
      return { ...base, paidThroughAt: '2026-07-14' };
    default:
      return base;
  }
}

/** The annual variant of `active` (distinct copy: year + "about $10 a month"). */
export function mockSubscriptionAnnual(): SubscriptionData {
  return {
    ...mockSubscription('active'),
    plan: 'annual',
    renewsAt: '2027-06-14',
  };
}

/** Base props with no-op callbacks; the dev page and tests override as needed. */
export function mockSettingsProps(
  overrides: Partial<SettingsScreenProps> = {},
): SettingsScreenProps {
  return {
    email: 'rosa.mendez@example.com',
    photoUrl: null,
    authMethod: 'magic-link',
    subscription: mockSubscription('trial'),
    notifications: NOTIF,
    loadState: 'ready',
    loadError: null,
    cardUpdatedNotice: false,
    trustBandSeen: false,
    onBack: () => {},
    onRetry: () => {},
    onTrustBandSeen: () => {},
    onUpdateCard: () => {},
    onCancelSubscription: async () => ({ ok: true }),
    onResume: () => {},
    onToggleNotification: () => {},
    onChangeEmail: async () => ({ ok: true }),
    onRemovePhoto: async () => ({ ok: true }),
    onSignOut: () => {},
    onDeleteAccount: async () => ({ ok: true }),
    onReturnToSignIn: () => {},
    deleteEnabled: true,
    ...overrides,
  };
}
