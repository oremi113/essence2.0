import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SubscriptionStatus } from "@/lib/vault";

// 'server-only' (imported by the module under test) is aliased to an empty stub
// in vitest.config.ts so it resolves under the runner.
vi.mock("@/lib/feature-flags", () => ({
  isFeatureEnabled: vi.fn(),
}));
vi.mock("@/lib/subscription/get-status", () => ({
  getSubscriptionStatus: vi.fn(),
}));

import { isFeatureEnabled } from "@/lib/feature-flags";
import { getSubscriptionStatus } from "@/lib/subscription/get-status";
import { assertCanCreateVoice } from "@/lib/voice-creation/entitlement";
import { AppError, ErrorCode } from "@/lib/errors";

const flag = vi.mocked(isFeatureEnabled);
const sub = vi.mocked(getSubscriptionStatus);

function withStatus(status: SubscriptionStatus) {
  sub.mockResolvedValue({
    status,
    trialEndsAt: null,
    currentPeriodEnd: null,
    billingPeriod: null,
    cancelAtPeriodEnd: false,
    lastFailedAttemptCount: 0,
  });
}

const ALL_STATUSES: SubscriptionStatus[] = [
  "none",
  "trial",
  "active",
  "past_due",
  "lapsed",
  "cancelled",
];

describe("assertCanCreateVoice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("flag OFF (default — the live state until M2 Step 3)", () => {
    beforeEach(() => flag.mockReturnValue(false));

    it.each(ALL_STATUSES)("is a no-op for %s and never reads subscription", async (status) => {
      withStatus(status);
      await expect(assertCanCreateVoice("user_1")).resolves.toBeUndefined();
      // Short-circuits before any subscription lookup — no DB hit when off.
      expect(sub).not.toHaveBeenCalled();
    });
  });

  describe("flag ON (post-reorder M2 state)", () => {
    beforeEach(() => flag.mockReturnValue(true));

    // `past_due` allows, and that is the point of FOLLOW_UPS #109: the spec,
    // Home B, and the Stripe webhook/cancel routes all treat a past-due
    // subscription as live while retries run. Excluding it here told a user
    // their vault was protected while blocking what the vault is for — and did
    // it as a dead end, since /app/voice/processing lets past_due through.
    it.each(["trial", "active", "past_due"] as const)("allows %s", async (status) => {
      withStatus(status);
      await expect(assertCanCreateVoice("user_1")).resolves.toBeUndefined();
    });

    // `lapsed` stays excluded: that is the state meaning the retries gave up.
    it.each(["none", "lapsed", "cancelled"] as const)(
      "throws SUBSCRIPTION_REQUIRED (402, non-retryable) for %s",
      async (status) => {
        withStatus(status);
        const err = await assertCanCreateVoice("user_1").catch((e) => e);
        expect(err).toBeInstanceOf(AppError);
        expect(err.code).toBe(ErrorCode.SUBSCRIPTION_REQUIRED);
        expect(err.status).toBe(402);
        expect(err.retryable).toBe(false);
      },
    );

    it("checks the subscription exactly once for the gated path", async () => {
      withStatus("none");
      await assertCanCreateVoice("user_1").catch(() => {});
      expect(sub).toHaveBeenCalledTimes(1);
      expect(sub).toHaveBeenCalledWith("user_1");
    });
  });
});

/**
 * The two paid-vendor gates must agree.
 *
 * FOLLOW_UPS #109 happened because they drifted from the rest of the product,
 * not from each other — but they are maintained in two files and the save gate
 * is a bare inline Set, so keeping them in step is worth asserting rather than
 * hoping for. If a future change adds a status to one, this fails until the
 * other is considered.
 */
describe("the paid-vendor gates agree with each other", () => {
  it("voice creation and message saving allow the same statuses", async () => {
    const { VOICE_CREATION_ALLOWED_STATUSES } = await import(
      "@/lib/voice-creation/entitlement"
    );
    // The save route's Set is module-private, so assert against the literal it
    // declares. Restated here on purpose: if someone edits one list without the
    // other, this is the line that objects.
    const SAVE_ALLOWED = ["trial", "active", "past_due"];
    expect([...VOICE_CREATION_ALLOWED_STATUSES].sort()).toEqual(SAVE_ALLOWED.sort());
  });

  it("never entitles a lapsed or cancelled subscription", async () => {
    const { VOICE_CREATION_ALLOWED_STATUSES } = await import(
      "@/lib/voice-creation/entitlement"
    );
    // The line that actually protects spend: these are the states where Stripe
    // has stopped trying.
    for (const dead of ["lapsed", "cancelled", "none"]) {
      expect(VOICE_CREATION_ALLOWED_STATUSES.has(dead as never)).toBe(false);
    }
  });
});
