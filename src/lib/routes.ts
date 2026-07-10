/**
 * Central map of internal page routes.
 *
 * Every push()/redirect()/<Link> target lives here so route strings aren't
 * duplicated across the app. Constants (not loose strings) make typos a
 * compile error and give one edit-point when a path moves — which the
 * prototype-stitching pass needs.
 *
 * Backend rule (CLAUDE.md): URL paths never change during a redesign. These
 * constants MIRROR the existing `src/app/**` route tree — keep them in sync
 * with the filesystem; don't rename a path here to "tidy" it.
 *
 * Scope: page routes only. API endpoints (`/api/**`) are deliberately NOT here
 * — they're a separate backend concern.
 */
export const ROUTES = {
  root: "/",
  home: "/home",
  onboarding: "/onboarding",
  signIn: "/auth/sign-in",

  record: "/app/record",
  recordComplete: "/app/record/complete",
  /** Placeholder First-Breath exit; pending a real destination — FOLLOW_UPS #25. */
  recordCompleteStub: "/app/record/complete/stub",
  voiceCreate: "/app/voice/create",
  voiceProcessing: "/app/voice/processing",
  shelf: "/app/shelf",

  // Canonical message-creation route (the Step 6 spine). The legacy
  // `/app/messages/new` was retired in M0 (FOLLOW_UPS #34) — it now permanently
  // redirects here, and all callers point at this one.
  messagesNew: "/messages/new",
  /** C3 Vault Limit Reached — the capped steady-state (3/3 saved). Routed
   *  from the A2-entry UX gate and the /save race-case 403. */
  messagesLimit: "/messages/limit",
  /** C2 Waitlist — the "look ahead" signup. Routed from C3 and (later) C1. */
  messagesWaitlist: "/messages/waitlist",

  vaultContinuity: "/app/vault/continuity",
  vaultProtect: "/app/vault/protect",
  vaultRestore: "/app/vault/restore",
  vaultReveal: "/app/vault/reveal",
  vaultSeal: "/app/vault/seal",
  vaultSealed: "/app/vault/sealed",

  /** Step 9 Settings & Trust — the control + reassurance surface (gear on Home B). */
  settings: "/app/settings",
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];

/**
 * `/auth/sign-in?next=<path>` — the post-login redirect target used by the
 * server-side auth guards. Mirrors the existing un-encoded form (the page
 * redirects pass a raw path); middleware builds its own encoded variant via
 * URLSearchParams and is intentionally left to do so.
 */
export function signInWithNext(next: string): string {
  return `${ROUTES.signIn}?next=${next}`;
}

/** `/app/vault/seal?plan=<plan>` */
export function vaultSealWithPlan(plan: string): string {
  return `${ROUTES.vaultSeal}?plan=${plan}`;
}

/** `/app/vault/continuity?plan=<plan>` */
export function vaultContinuityWithPlan(plan: string): string {
  return `${ROUTES.vaultContinuity}?plan=${plan}`;
}

/** `/messages/new/g/<generationId>` — A5/A6 deep-link within a creation flow. */
export function messageGenerationRoute(generationId: string): string {
  return `${ROUTES.messagesNew}/g/${generationId}`;
}

/**
 * `/messages/saved/<messageId>` — A7 Save Confirmation (ceremonial close).
 * Pass `{ ceremony: true }` on the 3rd (final) save to add
 * `?ceremony=three-shaped`, which the A7 page renders as the one-time C1
 * Three Shaped ceremony (Open Contracts: a query-param overlay, not a route).
 */
export function messageSavedRoute(
  messageId: string,
  opts?: { ceremony?: boolean },
): string {
  const base = `/messages/saved/${messageId}`;
  return opts?.ceremony ? `${base}?ceremony=three-shaped` : base;
}

/**
 * `/messages/new/g/<generationId>/reshape` — A4 Personal Note in the
 * reshape ("What it says") path. `generationId` is the row being
 * reshaped; submit writes a candidate back onto it and returns to its A6.
 */
export function messageReshapeRoute(generationId: string): string {
  return `${ROUTES.messagesNew}/g/${generationId}/reshape`;
}
