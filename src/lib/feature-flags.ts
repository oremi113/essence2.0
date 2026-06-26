export const FEATURE_FLAGS = {
  VAULT_STRIPE_ENABLED: process.env.VAULT_STRIPE_ENABLED === 'true',
  // FOLLOW_UPS #22 — gate paid voice creation (ElevenLabs) on an active
  // subscription. Decision is locked (gate=yes, no free path; Step 3 Card
  // Capture handoff), but stays OFF until M2 Step 3 lands the
  // card-capture-before-processing reorder. Before that reorder every user is
  // `none` at /start, so flipping this on would 402 the live happy path.
  VOICE_CREATION_REQUIRES_PAYMENT: process.env.VOICE_CREATION_REQUIRES_PAYMENT === 'true',
} as const;

export function isFeatureEnabled(flag: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[flag];
}
