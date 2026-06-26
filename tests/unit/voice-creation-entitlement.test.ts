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

    it.each(["trial", "active"] as const)("allows %s", async (status) => {
      withStatus(status);
      await expect(assertCanCreateVoice("user_1")).resolves.toBeUndefined();
    });

    it.each(["none", "past_due", "lapsed", "cancelled"] as const)(
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
