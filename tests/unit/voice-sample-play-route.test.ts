import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * GET /api/voice-profiles/:id/sample/play — the read half of Step 5.
 *
 * Same shape as `messages-play-route.test.ts`: the auth and rate-limit boundary
 * is stubbed so this exercises the handler's own branching.
 *
 * The branches are the point. This endpoint distinguishes four states, and the
 * distinction between `rendering` and everything else is load-bearing — the
 * §4.7 failure state needs to tell "wait, it is being made" from "this broke".
 *
 * It also must NEVER render. A GET that could reach ElevenLabs would let a
 * refresh spend money, so `generateSpeech` is mocked purely to assert it is
 * never called.
 */

vi.mock("@/lib/api/defineRoute", () => ({
  defineRoute: (_config: unknown, handler: unknown) => handler,
}));

let profileRow: Record<string, unknown> | null;
let profileError: unknown;

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: profileRow, error: profileError }),
          }),
        }),
      }),
    }),
  }),
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: () => ({}),
}));

const usageSpy = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  checkSignedUrlLimit: async () => ({ allowed: true }),
  assertAllowed: () => {},
  recordUsageEvent: async (...args: unknown[]) => {
    usageSpy(...args);
  },
}));

const signSpy = vi.fn(async () => "https://signed.example/sample.mp3?token=abc");
vi.mock("@/lib/audio/playback", () => ({
  createPlaybackSignedUrl: () => signSpy(),
  PLAYBACK_URL_EXPIRY_SEC: 120,
}));

const ttsSpy = vi.fn();
vi.mock("@/lib/elevenlabs", () => ({
  generateSpeech: (...a: unknown[]) => {
    ttsSpy(...a);
    throw new Error("a GET must never render");
  },
}));

vi.mock("@/lib/logger", () => ({ logEvent: () => {}, logError: () => {} }));

const { GET } = await import("@/app/api/voice-profiles/[id]/sample/play/route");

const call = () =>
  (GET as unknown as (ctx: unknown) => Promise<Response>)({
    user: { id: "u_1" },
    requestId: "req_1",
    params: { id: "vp_1" },
  });

const READY = {
  id: "vp_1",
  sample_status: "ready",
  sample_audio_path: "users/u_1/voice-profiles/vp_1/sample.mp3",
  sample_duration_ms: 3600,
  sample_line: "If you're hearing this, I found a way to stay.",
};

beforeEach(() => {
  profileRow = { ...READY };
  profileError = null;
  usageSpy.mockClear();
  signSpy.mockClear();
  ttsSpy.mockClear();
});

describe("GET sample/play", () => {
  it("row 20 — a ready sample returns a signed url, duration and the stored line", async () => {
    const res = await call();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.url).toContain("signed.example");
    expect(body.durationMs).toBe(3600);
    expect(body.expiresIn).toBe(120);
    // The line comes from the ROW, not the current constant: the screen
    // typesets it while the audio speaks it, so a copy change must not make an
    // existing sample read one thing and say another.
    expect(body.line).toBe(READY.sample_line);
    expect(usageSpy).toHaveBeenCalledTimes(1);
  });

  it("row 21 — `rendering` is 409, not 404", async () => {
    profileRow = { ...READY, sample_status: "rendering", sample_audio_path: null };

    const res = await call();
    const body = await res.json();

    // Distinguishable from failure on purpose — "wait" is not "this broke".
    expect(res.status).toBe(409);
    expect(body.status).toBe("rendering");
    expect(signSpy).not.toHaveBeenCalled();
    expect(usageSpy).not.toHaveBeenCalled();
  });

  it("row 22 — no sample yet is 404 with the status echoed", async () => {
    profileRow = { ...READY, sample_status: "none", sample_audio_path: null };

    const res = await call();
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.status).toBe("none");
    expect(usageSpy).not.toHaveBeenCalled();
  });

  it("a failed render is 404 with `failed` echoed, so the client can tell them apart", async () => {
    profileRow = { ...READY, sample_status: "failed", sample_audio_path: null };

    const res = await call();
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.status).toBe("failed");
  });

  it("row 23 — a profile the user does not own reads as not found", async () => {
    // The RLS-scoped select returns nothing for another user's row; the handler
    // must not distinguish "exists but yours" from "does not exist".
    profileRow = null;

    const res = await call();
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Voice profile not found");
    expect(signSpy).not.toHaveBeenCalled();
  });

  it("a ready status with no path still refuses rather than signing nothing", async () => {
    profileRow = { ...READY, sample_audio_path: null };

    const res = await call();

    expect(res.status).toBe(404);
    expect(signSpy).not.toHaveBeenCalled();
  });

  it("row 25 — no state reaches the vendor", async () => {
    for (const s of ["ready", "rendering", "none", "failed"]) {
      profileRow = { ...READY, sample_status: s };
      await call().catch(() => {});
    }
    profileRow = null;
    await call().catch(() => {});

    // A GET that could render would let a refresh spend money.
    expect(ttsSpy).not.toHaveBeenCalled();
  });

  it("usage is recorded only once a url is actually issued", async () => {
    profileRow = { ...READY, sample_status: "none", sample_audio_path: null };
    await call();
    expect(usageSpy).not.toHaveBeenCalled();

    profileRow = { ...READY };
    await call();
    expect(usageSpy).toHaveBeenCalledTimes(1);
  });
});
