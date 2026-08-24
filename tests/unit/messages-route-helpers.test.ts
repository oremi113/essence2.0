import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isActivePending, discardFailedGeneration } from "@/lib/messages/route-helpers";

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
 * Unit coverage for the failed-cold-start discard used by POST /generate. This
 * is the fix for the wedge where one transient LLM/TTS failure leaves an active
 * pending row that 429s (`pending_max`) every future cold-start forever — see
 * the follow-up `2026-07-10-a-failed-message-generation-permanently-wedges-creation-the`.
 * The behaviour that matters: it supersedes exactly the target row (so
 * `countActivePending` stops counting it) and never throws (best-effort — it
 * must not mask the generation failure already being returned).
 */
describe("discardFailedGeneration", () => {
  function makeSupabaseMock(result: { error: unknown }) {
    const calls: {
      table?: string;
      update?: Record<string, unknown>;
      eq: Array<[string, unknown]>;
      is: Array<[string, unknown]>;
    } = { eq: [], is: [] };

    const builder = {
      eq(col: string, val: unknown) {
        calls.eq.push([col, val]);
        return builder;
      },
      is(col: string, val: unknown) {
        calls.is.push([col, val]);
        return builder;
      },
      // Awaited by bestEffortWrite as `const { error } = await builder`.
      then(resolve: (v: { error: unknown }) => void) {
        resolve(result);
      },
    };

    const supabase = {
      from(table: string) {
        calls.table = table;
        return {
          update(payload: Record<string, unknown>) {
            calls.update = payload;
            return builder;
          },
        };
      },
    } as unknown as SupabaseClient;

    return { supabase, calls };
  }

  it("supersedes exactly the target row (generation + user, saved-null guard)", async () => {
    const { supabase, calls } = makeSupabaseMock({ error: null });

    await discardFailedGeneration(supabase, {
      generationId: "gen-1",
      userId: "user-1",
      requestId: "req-1",
      stage: "audio",
    });

    expect(calls.table).toBe("pending_generations");
    // Stamps superseded_at with an ISO timestamp — the column countActivePending
    // reads to decide a row is no longer an active in-flight flow.
    expect(typeof calls.update?.superseded_at).toBe("string");
    expect(new Date(calls.update?.superseded_at as string).toISOString()).toBe(
      calls.update?.superseded_at,
    );
    // Scoped to the owning user's specific generation…
    expect(calls.eq).toEqual([
      ["generation_id", "gen-1"],
      ["user_id", "user-1"],
    ]);
    // …and never clobbers a row a concurrent request has already saved.
    expect(calls.is).toEqual([["saved_message_id", null]]);
  });

  it("is best-effort: a failed supersede is swallowed, not thrown", async () => {
    const { supabase } = makeSupabaseMock({ error: { message: "db down" } });
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      discardFailedGeneration(supabase, {
        generationId: "gen-2",
        userId: "user-2",
        requestId: "req-2",
        stage: "text",
      }),
    ).resolves.toBeUndefined();

    vi.restoreAllMocks();
  });
});
