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

/** Mirrors GenerateSpeechWithTimestampsResult so a test can hand back either arm. */
type TtsResult =
  | {
      ok: true;
      audioBuffer: Buffer;
      contentType: string;
      alignment: null;
    }
  | { ok: false; status: number; code?: string; message: string };

const ttsSpy = vi.fn(
  async (): Promise<TtsResult> => ({
    ok: true,
    audioBuffer: Buffer.alloc(16000),
    contentType: "audio/mpeg",
    // Alignment absent here on purpose: these tests are about the money guard,
    // and the collapse has its own coverage in word-alignment.test.ts.
    alignment: null,
  }),
);
vi.mock("@/lib/elevenlabs", () => ({
  generateSpeechWithTimestamps: (...args: unknown[]) => ttsSpy(...(args as [])),
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

import {
  ensureVoiceSample,
  VOICE_SAMPLE_LINE,
  VOICE_SAMPLE_MAX_RENDERS,
} from "@/lib/voice-sample/ensureVoiceSample";

// ── the fake row + query builder ───────────────────────────────────────────

let profileRow: Record<string, unknown> | null;
let claimMatches: boolean;
let uploadError: unknown;
let finishError: unknown;
/** What the claim actually filtered on — the guard is only real if it is applied. */
let claimStatuses: string[] | null;
let claimCeiling: { col: string; bound: number } | null;
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
          // claim path: .eq().eq().in().lt().select().maybeSingle()
          in: (_col: string, statuses: string[]) => {
            claimStatuses = statuses;
            return {
              // The billing ceiling rides inside the claim, so the fake has to
              // model it here rather than beside it — see VOICE_SAMPLE_MAX_RENDERS.
              lt: (col: string, bound: number) => {
                claimCeiling = { col, bound };
                return {
                  select: () => ({
                    maybeSingle: async () => ({
                      data: claimMatches ? { id: "vp_1" } : null,
                      error: null,
                    }),
                  }),
                };
              },
            };
          },
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
  claimStatuses = null;
  claimCeiling = null;
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
      return { ok: true, audioBuffer: Buffer.alloc(16000), contentType: "audio/mpeg", alignment: null };
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
      ok: false,
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

/**
 * The billing ceiling.
 *
 * `failed` is deliberately re-claimable so the beat can recover from a
 * transient blip. Unbounded, that is a way to charge one user repeatedly for
 * one sample: the spend is counted at CLAIM time precisely because a render can
 * fail after the vendor has already billed, so a storage outage bills on every
 * attempt while never producing audio.
 *
 * This was tolerable while the only trigger was a one-time processing step. It
 * stopped being tolerable when entering the ceremony began triggering a render.
 *
 * Resolves docs/follow-ups/2026-09-10-voice-sample-retry-has-no-billing-cap.md
 */
describe("ensureVoiceSample — the billing ceiling", () => {
  it("refuses once the profile has been billed for the cap, without touching the vendor", async () => {
    profileRow = {
      ...READY_VOICE,
      sample_status: "failed",
      sample_render_count: VOICE_SAMPLE_MAX_RENDERS,
    };

    const result = await run();

    expect(ttsSpy).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: false,
      reason: "render_cap_reached",
      renderCount: VOICE_SAMPLE_MAX_RENDERS,
    });
    // Not even a claim was attempted — the refusal costs one read.
    expect(updates).toHaveLength(0);
  });

  it("still renders on the last attempt the cap allows", async () => {
    profileRow = {
      ...READY_VOICE,
      sample_status: "failed",
      sample_render_count: VOICE_SAMPLE_MAX_RENDERS - 1,
    };

    const result = await run();

    // Off-by-one guard: the cap is a ceiling on attempts taken, not on attempts
    // remaining. Burning the last one must work.
    expect(ttsSpy).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ ok: true, rendered: true });
  });

  it("puts the ceiling INSIDE the claim, not beside it", async () => {
    await run();

    // A pre-check alone can be passed by two callers at once, who then both
    // spend. The condition has to ride in the same atomic update that makes the
    // claim single-flight, or the cap is advisory.
    expect(claimStatuses).toEqual(["none", "failed"]);
    expect(claimCeiling).toEqual({
      col: "sample_render_count",
      bound: VOICE_SAMPLE_MAX_RENDERS,
    });
  });

  it("reports the cap, not `in_flight`, when a concurrent caller consumed the last attempt", async () => {
    // Our read saw room; by the time we claimed, someone else had taken it.
    // Zero rows match either way, so a lost race and a hit ceiling are
    // indistinguishable from the claim alone — and they are opposite
    // instructions to the caller: "wait a moment" vs "this will never render".
    // The re-read is what tells them apart, so it is what this test drives.
    let reads = 0;
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => {
                reads += 1;
                // 1st: the pre-claim read, with room left.
                // 2nd: the re-read after losing the race — the winner's
                //      increment has landed and the ceiling is now full.
                const data =
                  reads === 1
                    ? { ...READY_VOICE, sample_status: "failed", sample_render_count: VOICE_SAMPLE_MAX_RENDERS - 1 }
                    : { ...READY_VOICE, sample_render_count: VOICE_SAMPLE_MAX_RENDERS };
                return { data, error: null };
              },
            }),
          }),
        }),
        update: () => ({
          eq: () => ({
            eq: () => ({
              in: () => ({
                lt: () => ({
                  select: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
                }),
              }),
            }),
          }),
        }),
      }),
    };

    const result = await ensureVoiceSample({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase: supabase as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      service: makeService() as any,
      userId: "u_1",
      voiceProfileId: "vp_1",
      requestId: "req_1",
      startMs: 0,
    });

    expect(reads).toBe(2);
    expect(ttsSpy).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: false,
      reason: "render_cap_reached",
      renderCount: VOICE_SAMPLE_MAX_RENDERS,
    });
  });
});
