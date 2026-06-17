import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { promoteTrainingClipPath } from "@/lib/voice-training/promoteTrainingClipPath";
import { persistVoiceReady } from "@/lib/voice-training/persistVoiceReady";

/**
 * Regression coverage for the silent-write-failure fixes in the voice pipeline:
 *   #46 — init-upload's storage_path promotion must fail loud (else the clip
 *         row stays "pending" and commit loses the upload).
 *   #43 — voice-creation success must verify its write (else the user is told
 *         "ready" while the row stays "processing" after a paid creation).
 */

// ── #46: promoteTrainingClipPath ──────────────────────────────────────────
function clipPathClient(error: unknown) {
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

describe("promoteTrainingClipPath (#46)", () => {
  it("writes the real path + mime, scoped to the clip id", async () => {
    const { client, updateSpy, eqCalls } = clipPathClient(null);
    await promoteTrainingClipPath(client, "clip-1", {
      objectPath: "users/u/.../clip.webm",
      mime: "audio/webm",
    });
    expect(updateSpy).toHaveBeenCalledWith({
      storage_path: "users/u/.../clip.webm",
      mime_type: "audio/webm",
    });
    expect(eqCalls).toContainEqual(["id", "clip-1"]);
  });

  it("resolves on success", async () => {
    const { client } = clipPathClient(null);
    await expect(
      promoteTrainingClipPath(client, "clip-1", { objectPath: "p", mime: "audio/webm" }),
    ).resolves.toBeUndefined();
  });

  it("THROWS when the path write errors (no silent 'pending' row)", async () => {
    const { client } = clipPathClient({ message: "row locked" });
    await expect(
      promoteTrainingClipPath(client, "clip-1", { objectPath: "p", mime: "audio/webm" }),
    ).rejects.toThrow(/failed to set training clip path: row locked/i);
  });
});

// ── #43: persistVoiceReady ────────────────────────────────────────────────
// Chain: update().eq().eq().eq().select().maybeSingle()
function voiceReadyClient({ data, error }: { data: unknown; error: unknown }) {
  const updateSpy = vi.fn();
  const leaf = {
    eq() {
      return leaf;
    },
    select() {
      return leaf;
    },
    async maybeSingle() {
      return { data, error };
    },
  };
  const client = {
    from: () => ({
      update: (payload: Record<string, unknown>) => {
        updateSpy(payload);
        return leaf;
      },
    }),
  } as unknown as SupabaseClient<Database>;
  return { client, updateSpy };
}

const INPUT = {
  voiceProfileId: "vp-1",
  userId: "user-1",
  voiceId: "vendor-xyz",
  completedAt: "2026-06-17T00:00:00.000Z",
};

describe("persistVoiceReady (#43)", () => {
  it("writes status=ready + vendor_voice_id + timestamps, clearing errors", async () => {
    const { client, updateSpy } = voiceReadyClient({ data: { id: "vp-1" }, error: null });
    await persistVoiceReady(client, INPUT);
    expect(updateSpy).toHaveBeenCalledWith({
      status: "ready",
      vendor_voice_id: "vendor-xyz",
      processing_completed_at: INPUT.completedAt,
      ready_at: INPUT.completedAt,
      last_error_code: null,
      last_error_message: null,
      last_error_at: null,
    });
  });

  it("reports applied=true when the guarded update wrote a row", async () => {
    const { client } = voiceReadyClient({ data: { id: "vp-1" }, error: null });
    expect(await persistVoiceReady(client, INPUT)).toEqual({ applied: true });
  });

  it("reports applied=false when the monotonic guard matched zero rows", async () => {
    const { client } = voiceReadyClient({ data: null, error: null });
    expect(await persistVoiceReady(client, INPUT)).toEqual({ applied: false });
  });

  it("THROWS when the write errors (so the route 500s instead of 200-ing 'ready')", async () => {
    const { client } = voiceReadyClient({ data: null, error: { message: "deadlock" } });
    await expect(persistVoiceReady(client, INPUT)).rejects.toThrow(
      /failed to persist voice-ready state: deadlock/i,
    );
  });
});
