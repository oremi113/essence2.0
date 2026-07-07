'use client';

import { BreathStone } from '@/components/breath-stone';
import type { BillingPlan } from '@/lib/vault';

interface VaultSealScreenProps {
  billingPlan: BillingPlan;
  onCheckoutInitiate: (plan: BillingPlan) => void;
  onDismiss: () => void;
  /** Disables the CTA while the checkout request is in flight. */
  isProcessing?: boolean;
  /** Surfaces a warm, recoverable error when checkout couldn't start. */
  checkoutFailed?: boolean;
}

// Warm, recoverable copy for a checkout that never reached Stripe. Money voice:
// reassure first ("nothing was charged"), no "Error/Failed". Provisional — gets
// the Step 10 error-copy clarity pass (like the A4 pass) before launch.
const CHECKOUT_ERROR =
  "We couldn't reach our payment partner. Nothing was charged — please try again.";

// Prototype uses data-stone-state="vault-final" but the current BreathStone
// engine does not define that state yet. 'infused' (voice preserved, amber
// tint, ember pulse) is the closest match to the warmest ceremonial register.
// Swap when vault-final is added to the engine.
export function VaultSealScreen({
  billingPlan,
  onCheckoutInitiate,
  onDismiss,
  isProcessing = false,
  checkoutFailed = false,
}: VaultSealScreenProps) {
  return (
    <section className="vault-screen vault-screen--seal">
      <div className="vault-screen__inner">
        <div className="vault-seal__object">
          <BreathStone state="infused" size={220} />
        </div>
        <h1 className="vault-seal__headline">
          <span>Your voice deserves</span>
          <span>to be kept safe.</span>
        </h1>
        <p className="vault-seal__subhead">All it takes is one step.</p>
        <div className="vault-seal__body">
          <span>This is how you stay present.</span>
          <span>This is how you show up for the people who love you most.</span>
          <span>This is how your voice endures.</span>
        </div>
      </div>
      <div className="vault-seal__cta-group">
        <button
          type="button"
          className="vault-cta vault-cta--final"
          onClick={() => onCheckoutInitiate(billingPlan)}
          disabled={isProcessing}
        >
          Seal My Vault
        </button>
        {checkoutFailed && (
          <p className="vault-error" role="alert">
            {CHECKOUT_ERROR}
          </p>
        )}
        <button
          type="button"
          className="vault-dismiss vault-dismiss--secondary"
          onClick={onDismiss}
        >
          Maybe later
        </button>
      </div>
    </section>
  );
}
