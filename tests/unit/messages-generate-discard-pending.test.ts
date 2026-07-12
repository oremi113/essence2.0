import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * FOLLOW_UPS #93 — the cold-start POST /api/messages/generate inserts the
 * pending_generations row BEFORE text/audio run. If either then fails the route
 * returned 502 but left the row active (saved_message_id + superseded_at both
 * null) — exactly what countActivePending counts. With the cap at one active
 * flow per user, that orphan made the A5 "Try again" (a fresh cold-start POST)
 * 429 `pending_max` forever and blocked every future message.
 *
 * The fix supersedes the just-created row on any failure so the slot frees
 * immediately. These lock: superseded on text-fail, superseded on audio-fail,
 * and NOT superseded on the success path.
 *
 * The auth/schema boundary (defineRoute) and paid vendor calls are stubbed.
 */

vi.mock("@/lib/api/defineRoute", () => ({
  defineRoute: (_config: unknown, handler: unknown) => handler,
}));

// --- controllable per-test state ---
let textOk: boolean;
let audioOk: boolean;
const updateSpy = vi.fn();

function client() {
  return {
    from: () => ({
      // countActivePending is overridden below, so no select path is exercised.
      insert: () => ({
        select: () => ({ single: async () => ({ data: { generation_id: "gen-new" }, error: null }) }),
      }),
      update: (payload: Record<string, unknown>) => {
        updateSpy(payload);
        const chain: Record<string, unknown> = {};
        chain.eq = () => chain;
        chain.is = () => chain;
        // Thenable so a direct `await ...update().eq().eq()` resolves { error }.
        chain.then = (resolve: (v: { error: null }) => unknown) => resolve({ error: null });
        return chain;
      },
    }),
  };
}

vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => client() }));
vi.mock("@/lib/supabase/service", () => ({ createSupabaseServiceClient: () => ({}) }));

// Ready voice profile — skip the ownership/readiness query.
vi.mock("@/lib/guards", () => ({
  assertCanGenerateMessage: async () => ({ vendor_voice_id: "vv-1" }),
}));

// Keep STEP6_LIMITS / costLimitBlocked real; clear the two count gates.
vi.mock("@/lib/messages/cost-controls", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/messages/cost-controls")>();
  return {
    ...actual,
    countActivePending: async () => 0,
    countGenerationsThisHour: async () => 0,
  };
});

vi.mock("@/lib/rate-limit", () => ({ recordUsageEvent: async () => {} }));

vi.mock("@/lib/messages/generation", () => ({
  selectVariantByIndex: () => ({ id: "v0" }),
  getTemplateById: () => ({ id: "v0" }),
  generateMessageText: async () =>
    textOk ? { ok: true, text: "hello" } : { ok: false, code: "INTERNAL_ERROR" },
}));

vi.mock("@/lib/messages/audio", () => ({
  generateAndStoreAudio: async () => (audioOk ? { ok: true } : { ok: false, code: "AUDIO_FAILED" }),
}));

// bestEffortWrite ignores its query, but the update() expression is eagerly
// evaluated before the call — so updateSpy still records every payload.
vi.mock("@/lib/supabase/checked-write", () => ({ bestEffortWrite: () => {} }));
vi.mock("@/lib/logger", () => ({ logEvent: () => {}, logError: () => {}, durationSince: () => 0 }));

vi.mock("@/lib/messageTemplates", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/messageTemplates")>();
  return { ...actual, getCategoryVoiceSettings: () => ({}), normalizeRelationship: (r: unknown) => r };
});

import { POST } from "@/app/api/messages/generate/route";

type Handler = (ctx: {
  body: Record<string, unknown>;
  user: { id: string };
  requestId: string;
}) => Promise<Response>;

const COLD_START = {
  voiceProfileId: "vp-1",
  category: "reflection",
  pendingRecipientName: "Mom",
  pendingRecipientRelationship: "parent",
};

const call = () =>
  (POST as unknown as Handler)({ body: { ...COLD_START }, user: { id: "user-1" }, requestId: "req-1" });

const supersedeCalls = () =>
  updateSpy.mock.calls.map((c) => c[0] as Record<string, unknown>).filter((p) => "superseded_at" in p);

beforeEach(() => {
  textOk = true;
  audioOk = true;
  updateSpy.mockClear();
});

describe("POST /api/messages/generate — failed generation frees the pending slot (FOLLOW_UPS #93)", () => {
  it("supersedes the just-created row when AUDIO fails", async () => {
    audioOk = false;
    const res = await call();
    expect(res.status).toBe(502);
    const superseded = supersedeCalls();
    expect(superseded.length).toBeGreaterThanOrEqual(1);
    expect(typeof superseded[0].superseded_at).toBe("string");
    expect(Number.isNaN(Date.parse(superseded[0].superseded_at as string))).toBe(false);
  });

  it("supersedes the just-created row when TEXT fails", async () => {
    textOk = false;
    const res = await call();
    expect(res.status).toBe(502);
    expect(supersedeCalls().length).toBeGreaterThanOrEqual(1);
  });

  it("does NOT supersede on the success path", async () => {
    const res = await call();
    expect(res.status).toBe(200);
    expect(supersedeCalls()).toHaveLength(0);
  });
});
