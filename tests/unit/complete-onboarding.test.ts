import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  persistOnboardingCompletion,
  type OnboardingCompletionFields,
} from "@/lib/onboarding/completeOnboarding";

/**
 * Unit coverage for the onboarding-completion write (FOLLOW_UPS #42).
 *
 * The behavior that matters: a failed `profiles` UPDATE must RAISE, not resolve
 * silently — otherwise the wizard navigates the user into the app having lost
 * everything they typed. We inject a fake Supabase client so the throw-vs-resolve
 * contract is provable without a live database.
 */
const FIELDS: OnboardingCompletionFields = {
  first_name: "Sarah",
  last_name: "Okonkwo",
  display_name: "Sarah Okonkwo",
  date_of_birth: "1980-05-01",
  birth_year: 1980,
  city: "Miami",
  state: "FL",
  country: "US",
  terms_version_accepted: "2026-09-01-v1",
  terms_accepted_at: "2026-09-01T00:00:00.000Z",
};

function fakeClient(result: { error: { message: string } | null }) {
  const eq = vi.fn().mockResolvedValue(result);
  const update = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ update });
  const client = { from } as unknown as SupabaseClient;
  return { client, from, update, eq };
}

describe("persistOnboardingCompletion", () => {
  it("writes the fields + a completion timestamp scoped to the user", async () => {
    const { client, from, update, eq } = fakeClient({ error: null });

    await persistOnboardingCompletion(client, "user-1", FIELDS);

    expect(from).toHaveBeenCalledWith("profiles");
    const payload = update.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toMatchObject(FIELDS);
    expect(typeof payload.onboarding_completed_at).toBe("string");
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("throws when the update returns an error, surfacing the message", async () => {
    const { client } = fakeClient({ error: { message: "row-level security" } });

    await expect(
      persistOnboardingCompletion(client, "user-1", FIELDS),
    ).rejects.toThrow(/row-level security/);
  });

  it("resolves without throwing on a successful write", async () => {
    const { client } = fakeClient({ error: null });

    await expect(
      persistOnboardingCompletion(client, "user-1", FIELDS),
    ).resolves.toBeUndefined();
  });
});
