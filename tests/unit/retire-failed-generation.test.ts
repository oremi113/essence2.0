import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { retireFailedGeneration } from "@/lib/messages/retireFailedGeneration";

/**
 * Regression coverage for FOLLOW_UPS #93: a cold-start /generate that fails
 * (text or audio) used to leave its pending_generations row active
 * (saved_message_id + superseded_at both null), which countActivePending counts
 * — so the next cold-start 429'd on `pending_max` forever. retireFailedGeneration
 * stamps `superseded_at` so the failed row stops counting.
 *
 * Chain under test: from().update().eq().eq().is()  →  { error }
 */
function retireClient(error: unknown) {
  const updateSpy = vi.fn();
  const eqCalls: string[][] = [];
  const isCalls: [string, unknown][] = [];
  const leaf = {
    eq(...args: string[]) {
      eqCalls.push(args);
      return leaf;
    },
    is(col: string, val: unknown) {
      isCalls.push([col, val]);
      return Promise.resolve({ error });
    },
  };
  const client = {
    from: () => ({
      update: (payload: Record<string, unknown>) => {
        updateSpy(payload);
        return leaf;
      },
    }),
  } as unknown as SupabaseClient;
  return { client, updateSpy, eqCalls, isCalls };
}

const BASE = { generationId: "gen-1", userId: "user-1", requestId: "req-1" };

describe("retireFailedGeneration (#93)", () => {
  it("stamps superseded_at, scoped to generation_id + user_id + unsaved rows", async () => {
    const { client, updateSpy, eqCalls, isCalls } = retireClient(null);

    await retireFailedGeneration(client, BASE);

    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ superseded_at: expect.any(String) }),
    );
    // ISO timestamp, not a placeholder.
    const payload = updateSpy.mock.calls[0][0] as { superseded_at: string };
    expect(new Date(payload.superseded_at).toISOString()).toBe(payload.superseded_at);

    expect(eqCalls).toContainEqual(["generation_id", "gen-1"]);
    expect(eqCalls).toContainEqual(["user_id", "user-1"]);
    // Defensive: never retire a row that was already saved.
    expect(isCalls).toContainEqual(["saved_message_id", null]);
  });

  it("folds `extra` columns into the same write (text-failure branch)", async () => {
    const { client, updateSpy } = retireClient(null);

    await retireFailedGeneration(client, { ...BASE, extra: { text_status: "failed" } });

    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ superseded_at: expect.any(String), text_status: "failed" }),
    );
  });

  it("does not retire an already-superseded/saved row by omitting the guard (guard is present)", async () => {
    // The guard is the `.is('saved_message_id', null)` filter — assert it is the
    // terminal of the chain so a saved row is never matched.
    const { client, isCalls } = retireClient(null);
    await retireFailedGeneration(client, BASE);
    expect(isCalls).toHaveLength(1);
    expect(isCalls[0]).toEqual(["saved_message_id", null]);
  });

  it("is best-effort: a failed cleanup write is swallowed, not thrown", async () => {
    const { client } = retireClient({ message: "row locked" });
    // Must resolve (never throw) — it runs on an error path already returning a
    // failed/retryable response; throwing would mask that failure.
    await expect(retireFailedGeneration(client, BASE)).resolves.toBeUndefined();
  });
});
