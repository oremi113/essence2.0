'use client';

import { VAULT_BULLETS, VAULT_PRICING, type BillingPlan } from '@/lib/vault';

interface VaultProtectScreenProps {
  /** Current plan. The screen is fully controlled; the URL in the page layer
   *  is the source of truth so the choice survives refresh, back-button,
   *  and forwarding through continuity → seal. */
  plan: BillingPlan;
  onPlanChange: (plan: BillingPlan) => void;
  onCheckoutInitiate: (plan: BillingPlan) => void;
  onDismiss: () => void;
}

export function VaultProtectScreen({
  plan,
  onPlanChange,
  onCheckoutInitiate,
  onDismiss,
}: VaultProtectScreenProps) {
  const pricing = VAULT_PRICING[plan];

  return (
    <section className="vault-screen vault-screen--protect">
      <div className="vault-screen__texture" aria-hidden="true" />
      <div className="vault-screen__inner">
        <h1 className="vault-protect__headline">
          Preserve Your Voice
          <br />
          Long-Term
        </h1>
        <p className="vault-protect__subhead">
          Keep your voice available for the people who matter most.
        </p>

        <div className="vault-card">
          <div className="vault-card__toggle" role="tablist" aria-label="Billing plan">
            <button
              type="button"
              role="tab"
              aria-selected={plan === 'monthly'}
              className={`vault-card__toggle-opt${
                plan === 'monthly' ? ' vault-card__toggle-opt--active' : ''
              }`}
              onClick={() => onPlanChange('monthly')}
            >
              Monthly
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={plan === 'annual'}
              className={`vault-card__toggle-opt${
                plan === 'annual' ? ' vault-card__toggle-opt--active' : ''
              }`}
              onClick={() => onPlanChange('annual')}
            >
              Annual
              {plan === 'annual' && (
                <span className="vault-card__toggle-save">
                  {VAULT_PRICING.annual.savingsLabel}
                </span>
              )}
            </button>
          </div>

          <div className="vault-card__price">
            <p className="vault-card__price-main">{pricing.displayPrice}</p>
            <p className="vault-card__price-period">{pricing.period}</p>
            <p className="vault-card__price-alt">{pricing.altText}</p>
          </div>

          <div className="vault-card__divider" />

          <ul className="vault-card__bullets">
            {VAULT_BULLETS.map((bullet) => (
              <li key={bullet} className="vault-card__bullet">
                <svg
                  className="vault-card__bullet-check"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                {bullet}
              </li>
            ))}
          </ul>

          <div className="vault-card__divider" />

          <button
            type="button"
            className="vault-cta"
            onClick={() => onCheckoutInitiate(plan)}
          >
            Start 7-Day Trial
          </button>
          <p className="vault-card__reassurance">7 days free. Cancel anytime.</p>
        </div>

        <button type="button" className="vault-dismiss" onClick={onDismiss}>
          Not now
        </button>
      </div>
    </section>
  );
}
