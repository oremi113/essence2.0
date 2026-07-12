export const FEATURE_FLAGS = {
  // Master monetization switch. OFF: vault checkout returns a mock URL and the
  // spine guards (processing `?mock=true`, reveal `none`) run in their permissive
  // mock-walk form. ON (S5): checkout hits real Stripe, `?mock=true` goes inert,
  // and `none` at the post-payment beats routes to the Card Capture paywall.
  // Flip this together with VOICE_CREATION_REQUIRES_PAYMENT + real price IDs.
  VAULT_STRIPE_ENABLED: process.env.VAULT_STRIPE_ENABLED === 'true',
  // FOLLOW_UPS #22 — gate paid voice creation (ElevenLabs) on an active
  // subscription ({trial, active}); other statuses get 402. Decision is locked
  // (gate=yes, no free path; Step 3 Card Capture handoff). The card-capture-
  // before-processing reorder that gives a user `trial` before `/start` has
  // landed (spine S1–S3), so this is safe to flip on at S5 alongside
  // VAULT_STRIPE_ENABLED.
  VOICE_CREATION_REQUIRES_PAYMENT: process.env.VOICE_CREATION_REQUIRES_PAYMENT === 'true',
  // Voice-clone consent gate. When ON, creating a voice profile requires the
  // request to carry an affirmative consent-to-clone + ownership/anti-
  // impersonation attestation (biometric-consent exposure — BIPA/GDPR). Ships
  // dark (default OFF) and INERT: the server guard is pre-built but the capture
  // UI + the exact consent strings are owner/counsel deliverables (see
  // docs/follow-ups/2026-07-12-no-affirmative-consent-gate-before-voice-cloning.md).
  // DO NOT flip on until the create form actually sends `consentToClone` +
  // `ownershipAttested` — flipping first would 422 every voice creation, the
  // same inert-until-wired property as VOICE_CREATION_REQUIRES_PAYMENT.
  VOICE_CONSENT_REQUIRED: process.env.VOICE_CONSENT_REQUIRED === 'true',
  // Step 9 Settings — the self-serve "Delete account" control. Owner-approved
  // for P1 (simple self-serve, double-confirm), but ships dark: OFF until the
  // teardown + support-destination copy are signed off, then flipped on. Off
  // hides the control and its two beats entirely (screen prop `deleteEnabled`).
  ACCOUNT_DELETE_ENABLED: process.env.ACCOUNT_DELETE_ENABLED === 'true',
} as const;

export function isFeatureEnabled(flag: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[flag];
}
