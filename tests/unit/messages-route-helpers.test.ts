import { describe, expect, it } from "vitest";
import { isActivePending } from "@/lib/messages/route-helpers";

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
