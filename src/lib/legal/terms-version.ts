/**
 * Version stamp for the published legal documents (Terms, Privacy, Acceptable
 * Use, Beta Terms). Persisted on the profile as `terms_version_accepted` when a
 * user affirmatively accepts during onboarding, so we have a record of WHICH
 * version they agreed to.
 *
 * Bump this whenever the substance of any published policy changes, then
 * re-prompt existing users for acceptance. Keep it aligned with the effective
 * date stamped into docs/legal/*.md (currently September 1, 2026).
 */
export const TERMS_VERSION = '2026-09-01-v1';
