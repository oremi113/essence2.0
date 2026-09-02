import "server-only";
import { AppError, ErrorCode } from "@/lib/errors";
import { isFeatureEnabled } from "@/lib/feature-flags";

/**
 * Affirmations the user must make before ESSENCE creates a synthetic clone of
 * their voice. Both are boolean click-through flags carried on the voice-profile
 * create request:
 *   - `consentToClone`     — "I consent to ESSENCE and its service providers
 *                             processing my voice recordings to create and
 *                             operate my personalized synthetic voice."
 *   - `ownershipAttested`  — "This is my own voice, or I have authorization to
 *                             clone the voice of the person it belongs to."
 *
 * The EXACT user-facing strings are a counsel deliverable — do not treat the
 * copy above as final. This module only enforces that the affirmations were
 * made; the words live in the (still-to-build) capture UI.
 */
export type VoiceConsentInput = {
  consentToClone?: unknown;
  ownershipAttested?: unknown;
};

/**
 * Gate synthetic-voice creation on affirmative consent + ownership attestation.
 *
 * Pre-built pending counsel wording + the capture UI. Held behind
 * `VOICE_CONSENT_REQUIRED` (default OFF), mirroring the FOLLOW_UPS #22 payment
 * guard: inert until the create form actually sends the two flags, then the flag
 * flips on. See
 * docs/follow-ups/2026-07-12-no-affirmative-consent-gate-before-voice-cloning.md
 * and 2026-07-12-no-ownership-impersonation-attestation-before-cloning.md.
 *
 * No-op when the flag is off. When on, throws `CONSENT_REQUIRED` (422,
 * non-retryable) unless BOTH affirmations are strictly `true`.
 */
export function assertVoiceConsent(input: VoiceConsentInput): void {
  if (!isFeatureEnabled("VOICE_CONSENT_REQUIRED")) return;

  const granted = input.consentToClone === true && input.ownershipAttested === true;
  if (!granted) {
    throw new AppError(
      ErrorCode.CONSENT_REQUIRED,
      "Please confirm the voice is yours and that you consent to creating your synthetic voice.",
      422,
      false,
    );
  }
}
