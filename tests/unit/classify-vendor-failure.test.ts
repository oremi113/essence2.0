import { describe, expect, it } from "vitest";
import {
  classifyVendorFailure,
  VOICE_CREATE_OPERATOR_BLOCK_ACTION,
} from "@/lib/voice-creation/classify-vendor-failure";

describe("classifyVendorFailure", () => {
  describe("the failure that caused this to exist", () => {
    // Copied verbatim from voice_profiles.last_error_message on the profile of
    // the beta tester who sat on the wait screen for a day (2026-09-22). If
    // this case ever regresses, the whole point of the module is gone — so it
    // is pinned exactly as the vendor sent it, generic code and all.
    it("classifies the custom-voice ceiling as operator, despite a generic code", () => {
      expect(
        classifyVendorFailure({
          status: 400,
          code: "bad_request",
          message:
            "You have reached your maximum amount of custom voices (10 / 10). You can upgrade your subscription to increase your custom voice limit.",
        }),
      ).toBe("operator");
    });
  });

  describe("operator failures", () => {
    it.each([
      [401, "a rejected key"],
      [402, "payment required"],
      [403, "forbidden"],
    ])("treats HTTP %i as operator (%s)", (status) => {
      expect(classifyVendorFailure({ status })).toBe("operator");
    });

    it.each([
      "max_voice_limit_reached",
      "voice_limit_reached",
      "quota_exceeded",
      "invalid_api_key",
      "missing_permissions",
      "subscription_expired",
      "payment_required",
    ])("treats the structured code %s as operator", (code) => {
      expect(classifyVendorFailure({ status: 400, code })).toBe("operator");
    });

    it("matches structured codes case-insensitively and ignores stray whitespace", () => {
      expect(classifyVendorFailure({ status: 400, code: "  Quota_Exceeded " })).toBe("operator");
    });

    it.each([
      "You have reached your maximum amount of custom voices (10 / 10).",
      "Voice limit reached for this account.",
      "Please upgrade your subscription to continue.",
      "You have exceeded your character limit for this billing cycle.",
      "The API key you used is missing the permission user_read.",
      "Invalid API key provided.",
    ])("falls back to the message when no code is given: %s", (message) => {
      expect(classifyVendorFailure({ status: 400, message })).toBe("operator");
    });
  });

  describe("transient failures — the retry budget must still work", () => {
    it.each([
      [504, "Request timed out"],
      [502, "Bad gateway"],
      [500, "Internal server error"],
      [503, "Service unavailable"],
    ])("treats HTTP %i as transient (%s)", (status, message) => {
      expect(classifyVendorFailure({ status, message })).toBe("transient");
    });

    // 429 is the one that looks operator-ish and is not. From this vendor it
    // means "too many requests right now" — precisely the passing failure the
    // retry budget exists for. Misclassifying it would strand a user who only
    // needed to wait.
    it("treats a vendor 429 as transient, not as a quota wall", () => {
      expect(
        classifyVendorFailure({ status: 429, message: "Too many requests, please slow down." }),
      ).toBe("transient");
    });

    it("treats an unknown 400 as transient rather than guessing", () => {
      expect(
        classifyVendorFailure({ status: 400, code: "bad_request", message: "Something went wrong" }),
      ).toBe("transient");
    });

    it("handles a failure with neither code nor message", () => {
      expect(classifyVendorFailure({ status: 500 })).toBe("transient");
    });

    it("does not match on a substring that merely mentions a limit in passing", () => {
      expect(
        classifyVendorFailure({
          status: 400,
          message: "Audio sample exceeded the maximum duration limit for one clip.",
        }),
      ).toBe("transient");
    });
  });

  describe("failure direction", () => {
    // The safe direction is operator -> transient: the user retries and, at
    // worst, we are back to today's behaviour. The unsafe direction is
    // transient -> operator, which strands someone who could simply have tried
    // again. This pins that an unrecognised message never escalates.
    it("degrades to transient when a vendor rewords an operator message", () => {
      expect(
        classifyVendorFailure({
          status: 400,
          code: "bad_request",
          message: "Your workspace has used up all available voice slots.",
        }),
      ).toBe("transient");
    });
  });

  it("exposes a ledger action distinct from voice_create so the daily cap is unaffected", () => {
    expect(VOICE_CREATE_OPERATOR_BLOCK_ACTION).toBe("voice_create_operator_block");
    expect(VOICE_CREATE_OPERATOR_BLOCK_ACTION).not.toBe("voice_create");
  });
});
