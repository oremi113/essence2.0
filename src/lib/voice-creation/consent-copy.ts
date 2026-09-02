/**
 * Canonical voice-cloning consent strings + version.
 *
 * Single source for the affirmations the user must make before ESSENCE creates
 * a synthetic clone of their voice. The exact wording is the truth-passed copy
 * from docs/legal/ESSENCE_Compliance_Implementation_Pack.md Part 1 and must
 * stay consistent with the Terms of Service (§5.3, §5.4) and Acceptable Use
 * Policy (§1): ESSENCE supports the user's OWN voice only — there is no
 * "authorization from the owner / their estate" path today.
 *
 * When any string here changes, bump CONSENT_TEXT_VERSION and re-prompt existing
 * users before their next recording (the persisted consent record stores this
 * version, not the full text — see the voice_consent_records migration).
 *
 * Plain constants (no 'server-only'/'use client'): imported by the client
 * create-form today and by the server persistence path once it lands.
 */

/** Bump on ANY change to the strings below. Stored on each consent record. */
export const CONSENT_TEXT_VERSION = '2026-09-01-v1';

/** String 1 — consent to create/operate a synthetic voice. */
export const CONSENT_TO_CLONE_LABEL =
  'I consent to ESSENCE and its service providers creating and operating a synthetic model of my voice from these recordings, and generating audio in that voice for me.';

export const CONSENT_TO_CLONE_HELP =
  'Your recordings go to our voice provider, ElevenLabs, to build the model. Model training is turned off on our account, so your voice is never used to train AI. You can withdraw consent at any time by deleting your account.';

/** String 2 — ownership / anti-impersonation attestation (own voice ONLY). */
export const OWNERSHIP_ATTESTATION_LABEL =
  'This is my own voice. I am not recording, imitating, or submitting the voice of any other person, living or deceased.';

export const OWNERSHIP_ATTESTATION_HELP =
  'ESSENCE only supports your own voice today. We know people want to preserve a loved one’s voice, and we are not able to do that responsibly yet.';
