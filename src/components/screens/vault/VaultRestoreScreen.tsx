'use client';

import type { RestoreMode } from '@/lib/subscription/restore-mode';

/**
 * Full-screen "your vault is paused" surface. Rendered at /app/vault/restore
 * for users in past_due/lapsed/cancelled state. Pure UI — the actual handoff
 * (Customer Portal vs. a fresh checkout) is decided by the page layer and run
 * through the onRestore callback.
 *
 * Two copy axes, both driven by props:
 * - `hasRecordings` picks the reassurance line, so trial-ended-without-
 *   conversion users don't read "your messages are still here" when they never
 *   recorded.
 * - `mode` picks the action line + CTA label. A `past_due` user updates a card;
 *   a `lapsed`/`cancelled` user restarts (the old subscription is gone). The
 *   copy stays clear, not clever — it names the actual next step.
 */

const REASSURANCE_HAS_RECORDINGS =
  "Your messages are still here, exactly as you left them. They're not going anywhere.";
const REASSURANCE_NO_RECORDINGS =
  'Your vault is ready whenever you are — your first recording will be waiting.';

const ACTION_BY_MODE: Record<RestoreMode, { line: string; cta: string }> = {
  update_card: {
    line: 'Updating your card is the only step.',
    cta: 'Update my card',
  },
  restart: {
    line: "Starting again is the only step — you'll be on the same plan as before.",
    cta: 'Restart my vault',
  },
};

// Warm, recoverable copy for a restore that never reached Stripe. Money voice:
// reassure first ("nothing was charged"), no "Error/Failed". Provisional — gets
// the Step 10 error-copy clarity pass (like the A4 pass) before launch.
const RESTORE_ERROR =
  "We couldn't reach our payment partner. Nothing was charged — please try again.";

export interface VaultRestoreScreenProps {
  hasRecordings: boolean;
  /** Decides the action line + CTA label. Defaults to update_card. */
  mode?: RestoreMode;
  onRestore: () => void;
  /** Optional — lets the page gate duplicate clicks while the handoff spins up. */
  isRestoring?: boolean;
  /** Surfaces a warm, recoverable error when the restore handoff couldn't start. */
  restoreFailed?: boolean;
}

export function VaultRestoreScreen({
  hasRecordings,
  mode = 'update_card',
  onRestore,
  isRestoring = false,
  restoreFailed = false,
}: VaultRestoreScreenProps) {
  const reassurance = hasRecordings ? REASSURANCE_HAS_RECORDINGS : REASSURANCE_NO_RECORDINGS;
  const action = ACTION_BY_MODE[mode];

  return (
    <main className="vault-restore-screen">
      <div className="vault-restore-screen__inner">
        <h1 className="vault-restore-screen__header">Your vault is paused.</h1>

        <div className="vault-restore-screen__body">
          <p>{reassurance}</p>
          <p>{action.line}</p>
        </div>

        <button
          type="button"
          className="vault-restore-screen__cta"
          onClick={onRestore}
          disabled={isRestoring}
        >
          {action.cta}
        </button>

        {restoreFailed && (
          <p className="vault-error vault-restore-screen__error" role="alert">
            {RESTORE_ERROR}
          </p>
        )}
      </div>
    </main>
  );
}
