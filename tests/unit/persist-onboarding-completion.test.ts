import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import {
  persistOnboardingCompletion,
  type OnboardingCompletionFields,
} from "@/lib/onboarding/persistOnboardingCompletion";

/**
 * Regression coverage for FOLLOW_UPS #42 — the onboarding save must fail LOUD.
 * A swallowed write error here loses everything a new user typed and leaves
 * onboarding_completed_at null (treated as not-onboarded next visit).
 */

const FIELDS: OnboardingCompletionFields = {
  first_name: "Sarah",
  last_name: "Okafor",
  display_name: "Sarah Okafor",
  date_of_birth: "1968-04-23",
  birth_year: 1968,
  city: "Miami",
  state: "FL",
};

/** Minimal supabase double: from().update(payload).eq() → resolves {error}. */
function mockSupabase(error: unknown) {
  const updateSpy = vi.fn();
  const eqCalls: string[][] = [];
  const client = {
    from: () => ({
      update: (payload: Record<string, unknown>) => {
        updateSpy(payload);
        return {
          eq: (...args: string[]) => {
            eqCalls.push(args);
            return Promise.resolve({ error });
          },
        };
      },
    }),
  } as unknown as SupabaseClient<Database>;
  return { client, updateSpy, eqCalls };
}

describe("persistOnboardingCompletion", () => {
  it("writes the fields + onboarding_completed_at, scoped to the user", async () => {
    const { client, updateSpy, eqCalls } = mockSupabase(null);
    await persistOnboardingCompletion(client, "user-1", FIELDS, "2026-06-17T00:00:00.000Z");

    expect(updateSpy).toHaveBeenCalledWith({
      ...FIELDS,
      onboarding_completed_at: "2026-06-17T00:00:00.000Z",
    });
    expect(eqCalls).toContainEqual(["user_id", "user-1"]);
  });

  it("resolves (does not throw) on a successful write", async () => {
    const { client } = mockSupabase(null);
    await expect(
      persistOnboardingCompletion(client, "user-1", FIELDS),
    ).resolves.toBeUndefined();
  });

  it("THROWS when the write returns an error (no silent data loss)", async () => {
    const { client } = mockSupabase({ message: "permission denied" });
    await expect(
      persistOnboardingCompletion(client, "user-1", FIELDS),
    ).rejects.toThrow(/could not save your onboarding details: permission denied/i);
  });

  it("stamps a default completedAt when none is provided", async () => {
    const { client, updateSpy } = mockSupabase(null);
    await persistOnboardingCompletion(client, "user-1", FIELDS);
    const payload = updateSpy.mock.calls[0][0];
    expect(typeof payload.onboarding_completed_at).toBe("string");
    expect(Number.isNaN(Date.parse(payload.onboarding_completed_at))).toBe(false);
  });
});
