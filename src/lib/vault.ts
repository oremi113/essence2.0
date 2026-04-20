/**
 * Session 7a — Vault Reveal flow types and constants.
 *
 * Canonical source of truth for pricing, plan toggle, bullets, and the
 * analytics event names tied to the four-screen flow. 7b replaces the
 * `stripePriceId` placeholders when real Stripe products land.
 */

export type BillingPlan = 'monthly' | 'annual';

export type SubscriptionStatus =
  | 'none'        // User has never captured a card
  | 'trial'       // Card captured, 7-day trial active
  | 'active'      // Trial converted or paid directly
  | 'past_due'    // Payment failed; Stripe is retrying
  | 'lapsed'      // Trial ended without conversion, or payment failed past retry ceiling
  | 'cancelled';  // User voluntarily cancelled

export interface PlanPricing {
  monthly: {
    displayPrice: string;
    period: string;
    altText: string;
    priceCents: number;
    stripePriceId: string;
  };
  annual: {
    displayPrice: string;
    period: string;
    altText: string;
    priceCents: number;
    savingsLabel: string;
    stripePriceId: string;
  };
}

export const VAULT_PRICING: PlanPricing = {
  monthly: {
    displayPrice: '$12.99',
    period: 'per month',
    altText: 'or $119 per year',
    priceCents: 1299,
    stripePriceId: 'PLACEHOLDER_MONTHLY',
  },
  annual: {
    displayPrice: '$119',
    period: 'per year',
    altText: 'or $12.99 per month',
    priceCents: 11900,
    savingsLabel: 'Save 24%',
    stripePriceId: 'PLACEHOLDER_ANNUAL',
  },
};

export const VAULT_BULLETS = [
  '1 preserved voice profile',
  '3 lifetime messages included',
  'Secure long-term storage',
  'Private and encrypted',
] as const;

export interface VaultScreenCallbacks {
  onPlanChange: (plan: BillingPlan) => void;
  onCheckoutInitiate: (plan: BillingPlan) => Promise<void> | void;
  onDismiss: () => void;
  onBack: () => void;
}

// Analytics event names — 7c wires these into the analytics client.
export const VAULT_EVENTS = {
  REVEAL_VIEWED: 'vault_reveal_viewed',
  PROTECT_VIEWED: 'vault_protect_viewed',
  PROTECT_CTA_CLICKED: 'vault_protect_cta_clicked',
  CONTINUITY_VIEWED: 'vault_continuity_viewed',
  SEAL_VIEWED: 'vault_seal_viewed',
  SEAL_CTA_CLICKED: 'vault_seal_cta_clicked',
  SEALED_CONFIRMED: 'vault_sealed_confirmed',
  DISMISSED: 'vault_dismissed',
  PLAN_TOGGLED: 'vault_plan_toggled',
} as const;
