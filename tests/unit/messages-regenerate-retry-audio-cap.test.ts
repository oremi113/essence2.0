import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * FOLLOW_UPS #92 — the `retry_audio` branch of POST /api/messages/regenerate
 * used to render paid ElevenLabs audio with NO cost control at all: no hourly
 * cap, no usage-ledger row, and no precondition that the prior audio failed. A
 * signed-in client could loop it to rack up unbounded vendor spend, evading even
 * the 20/hr backstop the control arm enforces.
 *
 * These lock the three gates the fix adds:
 *  1. a succeeded render is a no-op (never re-billed),
 *  2. the hourly cap is checked BEFORE the render, and
 *  3. a `started` usage event is ledgered before the render (so the render both
 *     counts toward, and can no longer slip, the hourly cap).
 *
 * The auth/schema boundary (defineRoute) and the paid vendor calls are stubbed;
 * this exercises the handler's own control-flow.
 */

vi.mock("@/lib/api/defineRoute", () => ({
  defineRoute: (_config: unknown, handler: unknown) => handler,
}));

// --- controllable per-test state ---
let genRow: Record<string, unknown> | null;
let hourlyCount: number;

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    from: () => {
      // retry_audio only reads the pending row (select→eq→eq→maybeSingle); the
      // status reset goes through bestEffortWrite (stubbed no-op below).
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.is = () => chain;
      chain.update = () => chain;
      chain.maybeSingle = async () => ({ data: genRow, error: null });
      return chain;
    },
  }),
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: () => ({}),
}));

// Keep isActivePending + pendingNotFoundResponse real; stub only the paid-render
// precondition (the voice-profile load) so we don't have to mock that query.
vi.mock("@/lib/messages/route-helpers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/messages/route-helpers")>();
  return { ...actual, loadReadyVoiceProfile: async () => ({ ok: true, vendorVoiceId: "vv-1" }) };
});

// Keep STEP6_LIMITS / costLimitBlocked real; control the hourly count.
vi.mock("@/lib/messages/cost-controls", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/messages/cost-controls")>();
  return { ...actual, countGenerationsThisHour: async () => hourlyCount };
});

const recordUsageEvent = vi.fn((..._a: unknown[]) => Promise.resolve());
vi.mock("@/lib/rate-limit", () => ({
  recordUsageEvent: (...a: unknown[]) => recordUsageEvent(...a),
}));

const generateAndStoreAudio = vi.fn((..._a: unknown[]) => Promise.resolve({ ok: true }));
vi.mock("@/lib/messages/audio", () => ({
  generateAndStoreAudio: (...a: unknown[]) => generateAndStoreAudio(...a),
}));

vi.mock("@/lib/supabase/checked-write", () => ({ bestEffortWrite: () => {} }));
vi.mock("@/lib/logger", () => ({ logEvent: () => {}, logError: () => {}, durationSince: () => 0 }));

vi.mock("@/lib/messageTemplates", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/messageTemplates")>();
  return { ...actual, getCategoryVoiceSettings: () => ({}), normalizeRelationship: (r: unknown) => r };
});

import { POST } from "@/app/api/messages/regenerate/route";

type Handler = (ctx: {
  body: Record<string, unknown>;
  user: { id: string };
  requestId: string;
}) => Promise<Response>;

const call = (body: Record<string, unknown>) =>
  (POST as unknown as Handler)({ body, user: { id: "user-1" }, requestId: "req-1" });

const GEN = {
  generation_id: "gen-1",
  voice_profile_id: "vp-1",
  category: "reflection",
  template_variant: "v0",
  generated_text: "a finished message",
  audio_status: "failed",
  regenerate_count: 0,
  text_reroll_count: 0,
  audio_render_count: 0,
  recipient_id: null,
  pending_recipient_relationship: null,
  pending_recipient_descriptor: null,
  note: null,
  saved_message_id: null,
  superseded_at: null,
};

beforeEach(() => {
  genRow = { ...GEN };
  hourlyCount = 0;
  recordUsageEvent.mockClear();
  generateAndStoreAudio.mockClear();
});

describe("POST /api/messages/regenerate retry_audio — cost controls (FOLLOW_UPS #92)", () => {
  it("no-ops without spending when the audio already succeeded", async () => {
    genRow = { ...GEN, audio_status: "succeeded" };
    const res = await call({ generationId: "gen-1", mode: "retry_audio" });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ audioStatus: "succeeded" });
    expect(generateAndStoreAudio).not.toHaveBeenCalled();
    expect(recordUsageEvent).not.toHaveBeenCalled();
  });

  it("429s on the hourly cap before rendering (closes the evasion hole)", async () => {
    hourlyCount = 999;
    const res = await call({ generationId: "gen-1", mode: "retry_audio" });
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ code: "cost_limit_blocked", limit_kind: "hourly_max" });
    expect(generateAndStoreAudio).not.toHaveBeenCalled();
    expect(recordUsageEvent).not.toHaveBeenCalled();
  });

  it("ledgers a 'started' usage event BEFORE rendering when under the cap", async () => {
    const res = await call({ generationId: "gen-1", mode: "retry_audio" });
    expect(res.status).toBe(200);
    expect(recordUsageEvent).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ outcome: "started", meta: expect.objectContaining({ retryAudio: true }) }),
    );
    expect(generateAndStoreAudio).toHaveBeenCalledTimes(1);
    // The ledger row must precede the paid render, or the hourly count can't see it.
    expect(recordUsageEvent.mock.invocationCallOrder[0]).toBeLessThan(
      generateAndStoreAudio.mock.invocationCallOrder[0],
    );
  });
});
