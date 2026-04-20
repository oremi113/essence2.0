export const FEATURE_FLAGS = {
  VAULT_STRIPE_ENABLED: process.env.VAULT_STRIPE_ENABLED === 'true',
} as const;

export function isFeatureEnabled(flag: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[flag];
}
