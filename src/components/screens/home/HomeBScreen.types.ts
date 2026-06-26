import type { ShelfMessage } from "@/components/screens/shelf/types";

export type { ShelfMessage };

/**
 * The vault-status register the home shows, once per screen, factually
 * (MASTER_SPEC §1.6, §6.3). Derived server-side from the raw subscription
 * status — see `deriveVaultState` in the page layer:
 *   trial      → 'trial'        (free 7-day trial; CTA shimmers)
 *   active     → 'protected'    (paying; calm, no selling)
 *   past_due   → 'protected'    (vault still live; Stripe is retrying)
 *   lapsed     → 'lapsed'       (paused; "messages are safe"; CTA gates → restore)
 *   cancelled  → 'lapsed'
 */
export type HomeBVaultState = "trial" | "protected" | "lapsed";

/** Mirrors the shelf's load-state machine for the archive-preview fetch. */
export type HomeBLoadState = "loading" | "error" | "ready";

export interface HomeBScreenProps {
  /** Calm vault-status line — derived from the subscription (see type above). */
  vaultState: HomeBVaultState;
  /** Recent saved messages (newest first), client-fetched like the shelf. */
  messages: ShelfMessage[];
  /** Drives the loading skeleton / error overlay around the preview. */
  loadState: HomeBLoadState;
  /** Message shown in the error overlay when `loadState === 'error'`. */
  listError?: string | null;
  /** Retry the preview fetch (error overlay's "Try again"). */
  onRetry: () => void;
  /**
   * Visit #1 into Home B — the §6.4 "stepping into a new chapter" beat. Adds
   * the warm rich→cream ground settle, a heavier arrival stagger, and the
   * one-time first-arrival line. Inline, never a blocking overlay.
   */
  firstArrival?: boolean;
  /** Lifetime cap (STEP6_MAX_SAVED_MESSAGES). Defaults to 3. */
  maxSaved?: number;
  /** Primary action — create a message (→ /messages/new). */
  onCreate: () => void;
  /** Lapsed-only CTA — bring the vault back (→ /app/vault/restore). */
  onRestore: () => void;
  /** Tertiary — open the full Memory Shelf (→ /app/shelf). */
  onOpenShelf: () => void;
  /** Tap a preview row — opens the shelf (where playback lives). */
  onOpenMessage: (id: string) => void;
  /** 3/3-full forward action — hear about what comes next (→ /messages/limit). */
  onWaitlist: () => void;
  /** Quiet settings entry (dead-links until Step 9 / M3). */
  onSettings: () => void;
  /** Test/dev override; defaults to the system `prefers-reduced-motion`. */
  reducedMotionOverride?: boolean;
}
