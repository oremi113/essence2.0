import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Smoke coverage for GET /api/messages/:id/play — the playback half of the M1
 * keepsake loop. Focus: the play is RECORDED (played_count++ / last_played_at)
 * so the shelf's "unheard" glow retires, the signed URL is issued, and the
 * record-write is best-effort (never breaks playback). The auth/rate-limit
 * boundary is stubbed; this exercises the handler's own logic.
 */

// defineRoute → return the raw handler so we can call it with a fake context.
vi.mock("@/lib/api/defineRoute", () => ({
  defineRoute: (_config: unknown, handler: unknown) => handler,
}));

// Capture the message lookup result + the played-write outcome per test.
let messageRow: Record<string, unknown> | null;
let messageError: unknown;
let updateError: unknown;
const updateSpy = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: async () => ({ data: messageRow, error: messageError }),
          }),
        }),
      }),
      update: (payload: Record<string, unknown>) => {
        updateSpy(payload);
        return { eq: () => ({ eq: async () => ({ error: updateError }) }) };
      },
    }),
  }),
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: () => ({}),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkSignedUrlLimit: async () => ({ allowed: true }),
  assertAllowed: () => {},
  recordUsageEvent: async () => {},
}));

const signSpy = vi.fn(async () => "https://signed.example/audio.mp3?token=abc");
vi.mock("@/lib/audio/playback", () => ({
  createPlaybackSignedUrl: () => signSpy(),
  PLAYBACK_URL_EXPIRY_SEC: 60,
}));

const logEvent = vi.fn();
vi.mock("@/lib/logger", () => ({ logEvent: (...a: unknown[]) => logEvent(...a) }));

import { GET } from "@/app/api/messages/[id]/play/route";

type Handler = (ctx: {
  user: { id: string };
  requestId: string;
  params: { id: string };
}) => Promise<Response>;

function callGet(id = "msg-1", userId = "user-1") {
  return (GET as unknown as Handler)({
    user: { id: userId },
    requestId: "req-1",
    params: { id },
  });
}

const SAVED = {
  id: "msg-1",
  user_id: "user-1",
  status: "saved",
  storage_bucket: "essence-audio",
  storage_path: "users/user-1/.../audio.mp3",
  played_count: 0,
};

beforeEach(() => {
  messageRow = { ...SAVED };
  messageError = null;
  updateError = null;
  updateSpy.mockClear();
  signSpy.mockClear();
  logEvent.mockClear();
});

describe("GET /api/messages/:id/play — happy path", () => {
  it("returns 200 with the signed URL", async () => {
    const res = await callGet();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      url: "https://signed.example/audio.mp3?token=abc",
      expiresIn: 60,
    });
  });

  it("records the play: played_count++ and last_played_at stamped, scoped to the row", async () => {
    await callGet();
    expect(updateSpy).toHaveBeenCalledTimes(1);
    const payload = updateSpy.mock.calls[0][0];
    expect(payload.played_count).toBe(1); // 0 → 1
    expect(typeof payload.last_played_at).toBe("string");
    expect(Number.isNaN(Date.parse(payload.last_played_at as string))).toBe(false);
  });

  it("increments from the message's current count", async () => {
    messageRow = { ...SAVED, played_count: 4 };
    await callGet();
    expect(updateSpy.mock.calls[0][0].played_count).toBe(5);
  });

  it("coalesces a null played_count to start at 1", async () => {
    messageRow = { ...SAVED, played_count: null };
    await callGet();
    expect(updateSpy.mock.calls[0][0].played_count).toBe(1);
  });
});

describe("GET /api/messages/:id/play — best-effort record", () => {
  it("still returns the URL when the played-write fails, and logs it", async () => {
    updateError = { message: "update boom" };
    const res = await callGet();
    expect(res.status).toBe(200);
    expect((await res.json()).url).toBeTruthy();
    expect(logEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: "play_count_update_failed" })
    );
  });
});

describe("GET /api/messages/:id/play — guards (no URL, no record)", () => {
  it("404s when the message is not found", async () => {
    messageRow = null;
    const res = await callGet();
    expect(res.status).toBe(404);
    expect(signSpy).not.toHaveBeenCalled();
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("400s when the message is not yet saved", async () => {
    messageRow = { ...SAVED, status: "generating" };
    const res = await callGet();
    expect(res.status).toBe(400);
    expect(signSpy).not.toHaveBeenCalled();
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("404s when the audio object is missing", async () => {
    messageRow = { ...SAVED, storage_path: null };
    const res = await callGet();
    expect(res.status).toBe(404);
    expect(signSpy).not.toHaveBeenCalled();
    expect(updateSpy).not.toHaveBeenCalled();
  });
});
