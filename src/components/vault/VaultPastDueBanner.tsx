'use client';

/**
 * Quiet, non-alarming banner shown on /app/record when the user's
 * subscription is past_due. Three copy variants keyed off attemptCount.
 * Screen is pure UI — data fetch + Portal handoff happen in the page layer.
 */

interface CopyVariant {
  header: string;
  body: string;
}

const COPY_VARIANTS: Record<1 | 2 | 3, CopyVariant> = {
  1: {
    header: "Your card didn't go through this time.",
    body: "Stripe will try again in a few days. You don't need to do anything yet — but you can update your card now if you'd rather.",
  },
  2: {
    header: "Your card didn't go through again.",
    body: "Stripe will try once more in a few days. Updating your card now is the easiest fix.",
  },
  3: {
    header: 'One more attempt before your vault pauses.',
    body: "If this last try doesn't go through, your vault pauses until you update your card. Your messages are safe either way.",
  },
};

function pickVariant(attemptCount: number): CopyVariant {
  if (attemptCount <= 1) return COPY_VARIANTS[1];
  if (attemptCount === 2) return COPY_VARIANTS[2];
  return COPY_VARIANTS[3];
}

export interface VaultPastDueBannerProps {
  /**
   * Failed-attempt count driving variant selection (1/2/3+).
   * Values ≤ 1 render variant 1; 2 renders variant 2; 3+ renders variant 3.
   */
  attemptCount: number;

  /**
   * Invoked when the user taps "Update card."
   * Page layer should open the Customer Portal in a new tab.
   */
  onUpdateCard: () => void;
}

export function VaultPastDueBanner({
  attemptCount,
  onUpdateCard,
}: VaultPastDueBannerProps) {
  const copy = pickVariant(attemptCount);

  return (
    <div role="status" aria-live="polite" className="vault-past-due-banner">
      <div className="vault-past-due-banner__content">
        <p className="vault-past-due-banner__header">{copy.header}</p>
        <p className="vault-past-due-banner__body">{copy.body}</p>
      </div>
      <button
        type="button"
        className="vault-past-due-banner__cta"
        onClick={onUpdateCard}
      >
        Update card
      </button>
    </div>
  );
}
