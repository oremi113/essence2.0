import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Coverage for `ensureVoiceSample` — the Step 5 First Playback render.
 *
 * Focus is the money guard. Every render is a paid ElevenLabs call, and
 * CLAUDE.md requires the trigger to be idempotent against a refresh, a
 * double-tap, or a back-navigation. The mechanism is a conditional update that
 * CLAIMS the render before any vendor call, so what these tests actually assert
 * is: **when is `generateSpeech` allowed to be reached at all.**
 *
 * The claim's real serialization comes from Postgres row locking under READ
 * COMMITTED — a second UPDATE waits, then re-evaluates its WHERE against the
 * committed row and matches zero rows. That can't be unit-tested, so the mock
 * stands in for it: `claimMatches` is what the DB would have returned.
 */

const ttsSpy = vi.fn(async () => ({
  ok: true as const,
  audioBuffer: Buffer.alloc(16000),
  contentType: "audio/mpeg",
}));
vi.mock("@/lib/elevenlabs", () => ({
  generateSpeech: (...args: unknown[]) => ttsSpy(...(args as [])),
}));

vi.mock("@/lib/audio/mp3-duration", () => ({
  mp3DurationMsFromByteLength: () => 3600,
}));

vi.mock("@/lib/logger", () => ({
  logEvent: () => {},
  logError: () => {},
  durationSince: () => 1,
}));

vi.mock("@/lib/api/sanitize", () => ({ sanitizeErrorMessage: (m: string) => m }));

vi.mock("@/lib/supabase/checked-write", () => ({
  bestEffortWrite: async (q: unknown) => {
    await q;
  },
}));

import { ensureVoiceSample, VOICE_SAMPLE_LINE } from "@/lib/voice-sample/ensureVoiceSample";

// ── the fake row + query builder ───────────────────────────────────────────

let profileRow: Record<string, unknown> | null;
let claimMatches: boolean;
let uploadError: unknown;
let finishError: unknown;
const updates: Record<string, unknown>[] = [];

function makeSupabase() {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: profileRow, error: null }),
          }),
        }),
      }),
      update: (payload: Record<string, unknown>) => {
        updates.push(payload);
        const terminal = {
          // claim path: .eq().eq().in().select().maybeSingle()
          in: () => ({
            select: () => ({
              maybeSingle: async () => ({
                data: claimMatches ? { id: "vp_1" } : null,
                error: null,
              }),
            }),
          }),
          // finish / release path: .eq().eq() resolves directly
          then: (resolve: (v: unknown) => void) =>
            resolve({ error: payload.sample_status === "ready" ? finishError : null }),
        };
        return { eq: () => ({ eq: () => terminal }) };
      },
    }),
  };
}

function makeService() {
  return {
    storage: {
      from: () => ({
        upload: async () => ({ error: uploadError }),
      }),
    },
  };
}

const run = () =>
  ensureVoiceSample({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: makeSupabase() as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service: makeService() as any,
    userId: "u_1",
    voiceProfileId: "vp_1",
    requestId: "req_1",
    startMs: 0,
  });

const READY_VOICE = {
  id: "vp_1",
  status: "ready",
  vendor_voice_id: "vv_1",
  sample_audio_path: null,
  sample_duration_ms: null,
  sample_status: "none",
  sample_render_count: 0,
};

beforeEach(() => {
  ttsSpy.mockClear();
  updates.length = 0;
  profileRow = { ...READY_VOICE };
  claimMatches = true;
  uploadError = null;
  finishError = null;
});

describe("ensureVoiceSample — the money guard", () => {
  it("renders once when the voice is ready and nothing has claimed it", async () => {
    const result = await run();

    expect(ttsSpy).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ ok: true, rendered: true, durationMs: 3600 });
  });

  it("does NOT call the vendor when a sample already exists", async () => {
    profileRow = {
      ...READY_VOICE,
      sample_status: "ready",
      sample_audio_path: "users/u_1/voice-profiles/vp_1/sample.mp3",
      sample_duration_ms: 3600,
    };

    const result = await run();

    // The refresh / back-navigation case. It must cost nothing.
    expect(ttsSpy).not.toHaveBeenCalled();
    expect(result).toMatchObject({ ok: true, rendered: false });
  });

  it("does NOT call the vendor when another caller holds the claim", async () => {
    // What Postgres returns to the loser of two concurrent claims.
    claimMatches = false;

    const result = await run();

    expect(ttsSpy).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: false, reason: "in_flight" });
  });

  it("claims BEFORE spending — the claim write precedes the vendor call", async () => {
    let claimedBeforeTts = false;
    ttsSpy.mockImplementationOnce(async () => {
      claimedBeforeTts = updates.some((u) => u.sample_status === "rendering");
      return { ok: true as const, audioBuffer: Buffer.alloc(16000), contentType: "audio/mpeg" };
    });

    await run();

    expect(claimedBeforeTts).toBe(true);
  });

  it("counts the render as spend at claim time, not on success", async () => {
    await run();

    const claim = updates.find((u) => u.sample_status === "rendering");
    // A render that fails after the vendor call still cost money, so the
    // counter has to move when the claim is taken.
    expect(claim).toMatchObject({ sample_render_count: 1 });
  });

  it("does NOT call the vendor when the voice itself isn't ready", async () => {
    profileRow = { ...READY_VOICE, status: "processing", vendor_voice_id: null };

    const result = await run();

    expect(ttsSpy).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: false, reason: "voice_not_ready" });
  });

  it("releases the claim to `failed` when the vendor call fails, so a retry can re-claim", async () => {
    ttsSpy.mockImplementationOnce(async () => ({
      ok: false as const,
      status: 502,
      message: "upstream",
    }));

    const result = await run();

    expect(result).toMatchObject({ ok: false, reason: "render_failed" });
    // A stuck 'rendering' would wedge the beat forever.
    expect(updates.some((u) => u.sample_status === "failed")).toBe(true);
  });

  it("releases the claim when the upload fails", async () => {
    uploadError = { message: "storage down" };

    const result = await run();

    expect(result).toMatchObject({ ok: false, reason: "render_failed" });
    expect(updates.some((u) => u.sample_status === "failed")).toBe(true);
  });

  it("reports failure when the finishing write fails, rather than claiming success", async () => {
    // The audio is uploaded and paid for but nothing points at it. Reporting
    // success here would strand a paid object behind a row that says 'rendering'.
    finishError = { message: "write failed" };

    const result = await run();

    expect(result).toMatchObject({ ok: false, reason: "render_failed" });
  });

  it("speaks the §4.2 line, unaddressed to anyone", async () => {
    await run();

    expect(ttsSpy).toHaveBeenCalledWith(
      expect.objectContaining({ text: VOICE_SAMPLE_LINE, voiceId: "vv_1" }),
    );
    // Neutral: it must not imply a message was created or sent, and no
    // Recipient exists at this point in the journey.
    expect(VOICE_SAMPLE_LINE).not.toMatch(/vault/i);
  });
});
