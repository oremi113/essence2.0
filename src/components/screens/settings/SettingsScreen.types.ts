/**
 * Settings & Trust — the control + reassurance surface (Step 9).
 *
 * Production types for prototypes/essence-step9-settings-trust.html. The screen
 * is props-only (CLAUDE.md layer 3): it owns layout, the confirmation-sheet
 * experience, the arrival choreography, and the calm state register; every side
 * effect bubbles out via callbacks so the page owns Supabase / Stripe / routing.
 *
 * Data shape mirrors the prototype header (lines 12–18): the screen renders it,
 * never fetches it.
 */

/** Raw subscription status (matches the backend `getSubscriptionStatus`). */
export type SubscriptionStatus =
  | "trial"
  | "active"
  | "past_due"
  | "lapsed"
  | "cancelled";

/** Billing cadence for an `active` subscription (drives monthly vs annual copy). */
export type SubscriptionPlan = "monthly" | "annual";

export interface CardSummary {
  /** Brand as shown to the person, e.g. "Visa". */
  brand: string;
  /** Last four digits, e.g. "4242". */
  last4: string;
}

export interface SubscriptionData {
  status: SubscriptionStatus;
  /** Cadence — only meaningful when `status === 'active'`. */
  plan: SubscriptionPlan;
  /** ISO date the free trial ends (trial only). */
  trialEndsAt: string | null;
  /** ISO date the subscription next renews (active only). */
  renewsAt: string | null;
  /** ISO date access is paid through (cancelled — "open until"; also cancel-sheet). */
  paidThroughAt: string | null;
  /** Monthly price in cents (e.g. 1299 → "$12.99 a month"). */
  priceMonthlyCents: number;
  /** Annual price in cents (e.g. 11900 → "$119 a year"). */
  priceAnnualCents: number;
  /** Card on file, or null if none captured yet. */
  card: CardSummary | null;
}

export interface NotificationSettings {
  /** "A gentle heads-up before anything is charged." */
  trialReminders: boolean;
  /** "Only if a payment needs your attention." */
  paymentNotices: boolean;
}

/** Which notification toggle changed (bubbled to the page for persistence). */
export type NotificationKey = keyof NotificationSettings;

/** Initial-fetch machine — mirrors Home B's load-state register. */
export type SettingsLoadState = "loading" | "error" | "ready";

/**
 * Result of an async side effect the page owns. The screen awaits it and swaps
 * its own confirmation UI (sending → sent, or → the correct terminal) — keeping
 * every view switch inside the screen (presentation) while the page keeps the
 * effect (Supabase / Stripe).
 */
export interface ActionResult {
  ok: boolean;
  /** Optional message the screen surfaces inline on `ok === false`. */
  error?: string;
}

export interface SettingsScreenProps {
  // ── data (rendered, never fetched) ──────────────────────────────────────
  email: string;
  photoUrl: string | null;
  /** Only magic-link today; the Sign-in row is display-only because of it. */
  authMethod: "magic-link";
  subscription: SubscriptionData;
  notifications: NotificationSettings;

  // ── system state ─────────────────────────────────────────────────────────
  /** Drives the skeleton / error overlay around the whole content. */
  loadState: SettingsLoadState;
  /** Message shown in the error view when `loadState === 'error'`. */
  loadError?: string | null;
  /**
   * Inline "Your card is updated." confirmation, shown on return from Stripe's
   * hosted card sheet. The page sets it from the return param; the screen shows
   * a quiet notice and bubbles `onDismissCardNotice` once seen.
   */
  cardUpdatedNotice?: boolean;
  /**
   * Whether this person has already seen the full trust band (durable per-account
   * latch: `profiles.ui_flags.settings_trust_seen`). `false` → the full reassurance
   * band shows on this visit and `onTrustBandSeen` fires once; `true` → a slim
   * one-line residual ("Yours to manage, and yours alone.") shows instead, so the
   * band stops owning the top of Settings on every return. Defaults to `false`.
   */
  trustBandSeen?: boolean;

  // ── navigation / retry ───────────────────────────────────────────────────
  onBack: () => void;
  onRetry: () => void;
  /**
   * Fired once when the full trust band is shown for the first time, so the page
   * can latch `settings_trust_seen`. One-way (false → true); a lost write just
   * re-shows the full band once, so it's best-effort and never blocks render.
   */
  onTrustBandSeen?: () => void;

  // ── plan actions ─────────────────────────────────────────────────────────
  /**
   * Update the card on file — routes OUT to Stripe's hosted card sheet / Payment
   * Element (PCI surface the app never owns). Not a promise: it navigates away.
   */
  onUpdateCard: () => void;
  /** Confirmed cancel (after the cancel sheet's reassurance-first "Cancel"). */
  onCancelSubscription: () => Promise<ActionResult>;
  /** "Bring it back" — resume from lapsed / cancelled (routes to the restore arc). */
  onResume: () => void;
  /** Dismiss the "Your card is updated." notice once the person has seen it. */
  onDismissCardNotice?: () => void;

  // ── notifications ────────────────────────────────────────────────────────
  onToggleNotification: (key: NotificationKey, next: boolean) => void;

  // ── account ──────────────────────────────────────────────────────────────
  /**
   * Change the login email (magic-link identity change): the page sends a
   * confirm-link to the new address; the current email keeps working until it's
   * tapped. Resolves ok → the screen shows the "check your inbox" confirmation
   * in-place; !ok → the screen surfaces `error` under the field.
   */
  onChangeEmail: (newEmail: string) => Promise<ActionResult>;
  /** Remove the home photo (after the remove-photo sheet confirms). */
  onRemovePhoto: () => Promise<ActionResult>;
  /** Optional — add a photo when none is set (routes to the photo surface). */
  onAddPhoto?: () => void;

  // ── manage (quiet zone) ──────────────────────────────────────────────────
  onSignOut: () => void;
  /**
   * Run the account teardown (auth user + the person's rows + stored audio).
   * Resolves ok → the screen shows the calm "account is closed" terminal, then
   * the person taps "Return to sign in" (→ `onReturnToSignIn`); !ok → the screen
   * shows the "your account is still here" failure terminal. The screen NEVER
   * shows "closed" without an ok result — the page must not resolve ok until the
   * fallible multi-write has actually succeeded (FOLLOW_UPS #43/#45/#66).
   */
  onDeleteAccount: () => Promise<ActionResult>;
  /** Terminal "Return to sign in" after a successful close. */
  onReturnToSignIn: () => void;

  // ── config ───────────────────────────────────────────────────────────────
  /**
   * P1 gate for the delete-account control. Owner-approved simple self-serve;
   * behind a flag so it can ship dark. Defaults to true.
   */
  deleteEnabled?: boolean;
  /** Test/dev override; defaults to the system `prefers-reduced-motion`. */
  reducedMotionOverride?: boolean;
}
