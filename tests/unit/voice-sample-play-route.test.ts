import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * GET /api/voice-profiles/:id/sample/play — the read half of Step 5.
 *
 * Same shape as `messages-play-route.test.ts`: the auth and rate-limit boundary
 * is stubbed so this exercises the handler's own branching.
 *
 * The branches are the point. This endpoint distinguishes several states, and
 * the distinction between "wait, it is being made" and "this will never arrive"
 * is load-bearing — the §4.7 failure state is built on it.
 *
 * ── A rule that changed, deliberately ───────────────────────────────────────
 *
 * This file used to assert that the route NEVER renders: "a GET that could
 * reach ElevenLabs would let a refresh spend money."
 *
 * That rule was protecting the right thing and still cost users the feature.
 * The render hook fires inside `start`'s `result.ok` branch, which is reached
 * only when a *brand-new* voice was just created — and `start` returns early at
 * `status === "ready"`, 282 lines before it. So every profile that existed when
 * Step 5 shipped could never get a sample by any path: not a degraded beat, a
 * permanently silent one, for exactly the people already using the product.
 *
 * The route now renders on demand. The original concern is answered by three
 * fences rather than by refusing to spend, and each has a test below:
 *   1. the spend guard runs BEFORE any render (a refusal must not reach it),
 *   2. the claim inside `ensureVoiceSample` is single-flight, so a refresh
 *      collapses to `in_flight` instead of a second charge,
 *   3. `VOICE_SAMPLE_MAX_RENDERS` caps what one profile can ever be billed.
 *
 * Fences 2 and 3 live in `ensure-voice-sample.test.ts` against a real claim.
 * Here `ensureVoiceSample` is mocked, because what is under test is the route's
 * branching on its result.
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
let spendAllowed: boolean;
vi.mock("@/lib/rate-limit", () => ({
  checkSignedUrlLimit: async () => ({ allowed: true }),
  checkVoiceCreationLimit: async () => ({
    allowed: spendAllowed,
    reason: spendAllowed ? undefined : "Daily voice creation limit reached (5). Try again tomorrow.",
  }),
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

const RENDERED = {
  ok: true as const,
  audioPath: "users/u_1/voice-profiles/vp_1/sample.mp3",
  durationMs: 2230,
  line: "If you're hearing this, I found a way to stay.",
  wordOffsetsMs: [0, 180, 420],
  rendered: true,
};

const ensureSpy = vi.fn(async () => RENDERED as unknown);
vi.mock("@/lib/voice-sample/ensureVoiceSample", () => ({
  ensureVoiceSample: (...a: unknown[]) => ensureSpy(...(a as [])),
}));

vi.mock("@/lib/logger", () => ({
  logEvent: () => {},
  logError: () => {},
  durationSince: () => 1,
}));

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

/** A profile with no sample — the state that now triggers a render. */
const unrendered = (status: "none" | "failed") => ({
  ...READY,
  sample_status: status,
  sample_audio_path: null,
});

beforeEach(() => {
  profileRow = { ...READY };
  profileError = null;
  spendAllowed = true;
  usageSpy.mockClear();
  signSpy.mockClear();
  ensureSpy.mockClear();
  ensureSpy.mockResolvedValue(RENDERED as unknown);
});

describe("GET sample/play — the cached path", () => {
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
    // The overwhelmingly common path must never reach a vendor call.
    expect(ensureSpy).not.toHaveBeenCalled();
  });

  it("row 21 — `rendering` is 409, not 404, and does not start a second render", async () => {
    profileRow = { ...READY, sample_status: "rendering", sample_audio_path: null };

    const res = await call();
    const body = await res.json();

    // Distinguishable from failure on purpose — "wait" is not "this broke".
    expect(res.status).toBe(409);
    expect(body.status).toBe("rendering");
    expect(ensureSpy).not.toHaveBeenCalled();
    expect(signSpy).not.toHaveBeenCalled();
    expect(usageSpy).not.toHaveBeenCalled();
  });

  it("row 23 — a profile the user does not own reads as not found, and never renders", async () => {
    // The RLS-scoped select returns nothing for another user's row; the handler
    // must not distinguish "exists but yours" from "does not exist".
    profileRow = null;

    const res = await call();
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Voice profile not found");
    expect(ensureSpy).not.toHaveBeenCalled();
    expect(signSpy).not.toHaveBeenCalled();
  });
});

describe("GET sample/play — rendering on demand", () => {
  it.each(["none", "failed"] as const)(
    "%s renders the sample and returns it, rather than 404ing into a silent ceremony",
    async (status) => {
      profileRow = unrendered(status);

      const res = await call();
      const body = await res.json();

      expect(ensureSpy).toHaveBeenCalledTimes(1);
      expect(res.status).toBe(200);
      expect(body.url).toContain("signed.example");
      // Straight from the render, not from the stale row we read first.
      expect(body.durationMs).toBe(RENDERED.durationMs);
      expect(body.line).toBe(RENDERED.line);
      expect(body.wordOffsetsMs).toEqual(RENDERED.wordOffsetsMs);
      expect(usageSpy).toHaveBeenCalledTimes(1);
    }
  );

  it("a ready status with no path is repaired by a render, not refused", async () => {
    // Inconsistent row: claims ready, has nothing to play. Previously a dead
    // end; now it heals on the next request.
    profileRow = { ...READY, sample_audio_path: null };

    const res = await call();

    expect(ensureSpy).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
  });

  it("the spend guard runs BEFORE the render, and a refusal never reaches the vendor", async () => {
    profileRow = unrendered("none");
    spendAllowed = false;

    const res = await call();
    const body = await res.json();

    expect(res.status).toBe(429);
    expect(body.status).toBe("rate_limited");
    // The whole point of the guard: no claim, no vendor call, no charge.
    expect(ensureSpy).not.toHaveBeenCalled();
    expect(signSpy).not.toHaveBeenCalled();
    expect(usageSpy).not.toHaveBeenCalled();
  });

  it("a concurrent render is 409 — the caller waits, it does not start a second one", async () => {
    profileRow = unrendered("none");
    ensureSpy.mockResolvedValue({ ok: false, reason: "in_flight" } as unknown);

    const res = await call();
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.status).toBe("in_flight");
    expect(usageSpy).not.toHaveBeenCalled();
  });

  it("the billing cap is terminal — 404, and the reason says so rather than inviting a retry", async () => {
    profileRow = unrendered("failed");
    ensureSpy.mockResolvedValue({
      ok: false,
      reason: "render_cap_reached",
      renderCount: 3,
    } as unknown);

    const res = await call();
    const body = await res.json();

    // 404 not 409: retrying will never help, and the client must not treat this
    // as transient. The beat plays silently and stops costing money.
    expect(res.status).toBe(404);
    expect(body.status).toBe("render_cap_reached");
    expect(usageSpy).not.toHaveBeenCalled();
  });

  it.each(["voice_not_ready", "render_failed"] as const)(
    "%s is 404 with the reason echoed, so the client can tell the cases apart",
    async (reason) => {
      profileRow = unrendered("none");
      ensureSpy.mockResolvedValue({ ok: false, reason, code: "TTS_FAILED" } as unknown);

      const res = await call();
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.status).toBe(reason);
      expect(signSpy).not.toHaveBeenCalled();
    }
  );

  it("usage is recorded only once a url is actually issued", async () => {
    profileRow = unrendered("none");
    ensureSpy.mockResolvedValue({ ok: false, reason: "render_failed", code: "X" } as unknown);
    await call();
    expect(usageSpy).not.toHaveBeenCalled();

    profileRow = { ...READY };
    await call();
    expect(usageSpy).toHaveBeenCalledTimes(1);
  });
});
