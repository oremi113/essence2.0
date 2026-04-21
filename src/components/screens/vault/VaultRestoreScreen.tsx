'use client';

/**
 * Full-screen "your vault is paused" surface. Rendered at /app/vault/restore
 * for users in lapsed/cancelled state. Pure UI — Portal handoff handled by
 * the page layer via onRestore callback.
 *
 * Body copy branches on hasRecordings so trial-ended-without-conversion
 * users don't read "your messages are still here" when they never recorded.
 */

interface CopyVariant {
  body1: string;
  body2: string;
}

const COPY_HAS_RECORDINGS: CopyVariant = {
  body1: "Your messages are still here, exactly as you left them. They're not going anywhere.",
  body2: "When you're ready to bring the vault back, updating your card is the only step.",
};

const COPY_NO_RECORDINGS: CopyVariant = {
  body1: 'Your vault is ready when you are. Updating your card is the only step.',
  body2: 'When you come back, your first recording will be waiting.',
};

export interface VaultRestoreScreenProps {
  hasRecordings: boolean;
  onRestore: () => void;
  /** Optional — lets the page gate duplicate clicks while a portal session spins up. */
  isRestoring?: boolean;
}

export function VaultRestoreScreen({
  hasRecordings,
  onRestore,
  isRestoring = false,
}: VaultRestoreScreenProps) {
  const copy = hasRecordings ? COPY_HAS_RECORDINGS : COPY_NO_RECORDINGS;

  return (
    <main className="vault-restore-screen">
      <div className="vault-restore-screen__inner">
        <h1 className="vault-restore-screen__header">Your vault is paused.</h1>

        <div className="vault-restore-screen__body">
          <p>{copy.body1}</p>
          <p>{copy.body2}</p>
        </div>

        <button
          type="button"
          className="vault-restore-screen__cta"
          onClick={onRestore}
          disabled={isRestoring}
        >
          Bring my vault back
        </button>
      </div>
    </main>
  );
}
