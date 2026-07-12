import { describe, it, expect, vi, beforeEach } from "vitest";

// 'server-only' (imported by the module under test) is aliased to an empty stub
// in vitest.config.ts so it resolves under the runner.
vi.mock("@/lib/feature-flags", () => ({
  isFeatureEnabled: vi.fn(),
}));

import { isFeatureEnabled } from "@/lib/feature-flags";
import { assertVoiceConsent } from "@/lib/voice-creation/consent";
import { AppError, ErrorCode } from "@/lib/errors";

const flag = vi.mocked(isFeatureEnabled);

describe("assertVoiceConsent", () => {
  beforeEach(() => {
    flag.mockReset();
  });

  describe("flag OFF (default) — inert", () => {
    beforeEach(() => flag.mockReturnValue(false));

    it("is a no-op even when no affirmations are present", () => {
      expect(() => assertVoiceConsent({})).not.toThrow();
    });

    it("is a no-op even when affirmations are explicitly false", () => {
      expect(() =>
        assertVoiceConsent({ consentToClone: false, ownershipAttested: false }),
      ).not.toThrow();
    });

    it("never reads the flag more than the single gate check", () => {
      assertVoiceConsent({});
      expect(flag).toHaveBeenCalledWith("VOICE_CONSENT_REQUIRED");
    });
  });

  describe("flag ON — enforced", () => {
    beforeEach(() => flag.mockReturnValue(true));

    it("passes when both affirmations are strictly true", () => {
      expect(() =>
        assertVoiceConsent({ consentToClone: true, ownershipAttested: true }),
      ).not.toThrow();
    });

    it.each([
      ["both missing", {}],
      ["consent missing", { ownershipAttested: true }],
      ["attestation missing", { consentToClone: true }],
      ["consent false", { consentToClone: false, ownershipAttested: true }],
      ["attestation false", { consentToClone: true, ownershipAttested: false }],
      ["truthy-but-not-true", { consentToClone: "yes", ownershipAttested: 1 }],
    ])("throws CONSENT_REQUIRED (422) when %s", (_label, input) => {
      try {
        assertVoiceConsent(input as Record<string, unknown>);
        throw new Error("expected assertVoiceConsent to throw");
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).code).toBe(ErrorCode.CONSENT_REQUIRED);
        expect((err as AppError).status).toBe(422);
        expect((err as AppError).retryable).toBe(false);
      }
    });
  });
});
