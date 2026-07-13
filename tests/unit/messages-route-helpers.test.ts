import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isActivePending, retireFailedPendingGeneration } from "@/lib/messages/route-helpers";

/**
 * A minimal chainable pending_generations builder that records the `.update()`
 * payload and `.eq()` filters, then resolves to a Supabase write envelope. Lets
 * the retire tests assert exactly what would hit the database without a live DB.
 */
function mockSupabase(result: { error: unknown } = { error: null }) {
  const calls = { update: null as Record<string, unknown> | null, eq: [] as Array<[string, unknown]>, from: [] as string[] };
  const builder = {
    update(payload: Record<string, unknown>) {
      calls.update = payload;
      return builder;
    },
    eq(col: string, val: unknown) {
      calls.eq.push([col, val]);
      return builder;
    },
    then(resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) {
      return Promise.resolve({ data: null, ...result }).then(resolve, reject);
    },
  };
  const client = {
    from(table: string) {
      calls.from.push(table);
      return builder;
    },
    calls,
  };
  return client as unknown as SupabaseClient & { calls: typeof calls };
}

/**
 * Unit coverage for the pure active-pending guard shared by the Step 6
 * generate/regenerate/commit routes. The Supabase-touching helper
 * (loadReadyVoiceProfile) is exercised by the route smoke tests
 * (tests/smoke/messages.spec.ts — VOICE_NOT_READY).
 */
describe("isActivePending", () => {
  const active = { saved_message_id: null, superseded_at: null };

  it("is true only when the row exists and is neither saved nor superseded", () => {
    expect(isActivePending(active)).toBe(true);
  });

  it("is false for a missing row", () => {
    expect(isActivePending(null)).toBe(false);
  });

  it("is false once the generation has been saved", () => {
    expect(isActivePending({ saved_message_id: "msg-1", superseded_at: null })).toBe(false);
  });

  it("is false once the generation has been superseded", () => {
    expect(isActivePending({ saved_message_id: null, superseded_at: "2026-06-11T00:00:00Z" })).toBe(false);
  });

  it("is false when both saved and superseded are set", () => {
    expect(isActivePending({ saved_message_id: "msg-1", superseded_at: "2026-06-11T00:00:00Z" })).toBe(false);
  });

  it("accepts richer rows structurally (extra columns ignored)", () => {
    const row = { saved_message_id: null, superseded_at: null, generation_id: "g1", category: "birthday" };
    expect(isActivePending(row)).toBe(true);
    // narrows: the extra fields remain accessible after the guard
    if (isActivePending(row)) expect(row.generation_id).toBe("g1");
  });
});

/**
 * Coverage for the FOLLOW_UPS #93 fix: a terminally-failed cold-start generation
 * must release the per-user active-pending slot so the next retry isn't wedged
 * behind `pending_max`. Retiring is stamping `superseded_at` — the same flag
 * `countActivePending` / `isActivePending` already treat as "no longer active".
 */
describe("retireFailedPendingGeneration", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("stamps superseded_at on the target row, scoped to generation + user", async () => {
    const client = mockSupabase();
    const ok = await retireFailedPendingGeneration(client, {
      generationId: "gen-1",
      userId: "user-1",
      requestId: "req-1",
    });

    expect(ok).toBe(true);
    expect(client.calls.from).toEqual(["pending_generations"]);
    // superseded_at is the flag that removes the row from countActivePending —
    // set to a real ISO timestamp so every downstream reader retires it.
    expect(typeof client.calls.update?.superseded_at).toBe("string");
    expect(Number.isNaN(Date.parse(client.calls.update!.superseded_at as string))).toBe(false);
    // scoped so it can never retire another user's / another generation's row
    expect(client.calls.eq).toEqual([
      ["generation_id", "gen-1"],
      ["user_id", "user-1"],
    ]);
  });

  it("folds an extra terminal status into the same write", async () => {
    const client = mockSupabase();
    await retireFailedPendingGeneration(client, {
      generationId: "gen-2",
      userId: "user-2",
      fields: { text_status: "failed" },
    });

    expect(client.calls.update?.text_status).toBe("failed");
    expect(typeof client.calls.update?.superseded_at).toBe("string");
  });

  it("is best-effort: a failed cleanup write resolves false, never throws", async () => {
    const client = mockSupabase({ error: { message: "db down" } });
    await expect(
      retireFailedPendingGeneration(client, { generationId: "gen-3", userId: "user-3" }),
    ).resolves.toBe(false);
  });
});
