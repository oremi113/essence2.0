/**
 * Session 7a — Vault Reveal flow types and constants.
 *
 * Canonical source of truth for the DISPLAY pricing, plan toggle, bullets, and
 * the analytics event names tied to the four-screen flow. The Stripe price IDs
 * used for checkout live in env (`STRIPE_PRICE_ID_VAULT_{MONTHLY,ANNUAL}`, read
 * in `create-checkout-session.ts`), not here.
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
  };
  annual: {
    displayPrice: string;
    period: string;
    altText: string;
    priceCents: number;
    savingsLabel: string;
  };
}

// Must match the live Stripe prices exactly — this is what the user READS
// while Stripe decides what to CHARGE. They had drifted: the annual Stripe
// price is 11999, while this said $119 / 11900, so a customer would have been
// shown "$119 per year" and billed $119.99. Reconciled to Stripe 2026-09-08.
// If a Stripe price ever changes, change it here in the same commit, and check
// docs/legal/ESSENCE_Terms_of_Service_v1_DRAFT.md (then `npm run legal:build`),
// which states both prices to the customer.
export const VAULT_PRICING: PlanPricing = {
  monthly: {
    displayPrice: '$12.99',
    period: 'per month',
    altText: 'or $119.99 per year',
    priceCents: 1299,
  },
  annual: {
    displayPrice: '$119.99',
    period: 'per year',
    altText: 'or $12.99 per month',
    priceCents: 11999,
    // $12.99 x 12 = $155.88; $119.99 is 23.0% off that. Was "Save 24%", which
    // was already rounded up from the old $119 (23.7%) — a savings claim is a
    // pricing claim, so it tracks the real number.
    savingsLabel: 'Save 23%',
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
