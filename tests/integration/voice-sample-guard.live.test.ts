import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * LIVE integration coverage for the Step 5 First Playback render guard.
 *
 * This is the half `tests/unit/ensure-voice-sample.test.ts` cannot reach. The
 * unit test mocks the database, so the thing it proves is "the code branches
 * correctly given what the DB returned." The single-flight guarantee, though,
 * does not live in the code — it lives in **Postgres row locking under READ
 * COMMITTED**: a second UPDATE blocks on the first, then re-evaluates its WHERE
 * against the committed row and matches nothing. Only a real database can show
 * that, and every render is real money, so it is worth showing.
 *
 * Requires the local stack (`supabase start`). Skips itself otherwise rather
 * than failing, so `npm run test:unit` stays green without Docker.
 *
 * It also needs two fixture rows in `auth.users`. They are created in SQL, not
 * through the Auth admin API: this CLI issues `sb_secret_` keys and its gotrue
 * rejects them for admin calls ("signing method HS256 is invalid"), while REST
 * accepts them fine. The test never signs in as these users — it only needs
 * valid ids for the foreign key — so SQL is the shorter path:
 *
 *   docker exec -i $(docker ps -qf name=supabase_db) psql -U postgres -d postgres -c "
 *     insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
 *                             email_confirmed_at, created_at, updated_at)
 *     values ('00000000-0000-4000-8000-000000000001',
 *             '00000000-0000-0000-0000-000000000000','authenticated','authenticated',
 *             'fpb-live-a@example.test','x',now(),now(),now()),
 *            ('00000000-0000-4000-8000-000000000002',
 *             '00000000-0000-0000-0000-000000000000','authenticated','authenticated',
 *             'fpb-live-b@example.test','x',now(),now(),now())
 *     on conflict (id) do nothing;"
 *
 * ElevenLabs is stubbed. What is under test is the claim, not the vendor, and a
 * live test that bills the owner to assert a boolean would be a bad trade.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

let ttsCalls = 0;
/** Set to make the next vendor call fail once, for the release-path test. */
let ttsFailOnce: { status: number; message: string } | null = null;

vi.mock("@/lib/elevenlabs", () => ({
  generateSpeech: async () => {
    ttsCalls++;
    if (ttsFailOnce) {
      const f = ttsFailOnce;
      ttsFailOnce = null;
      return { ok: false as const, status: f.status, message: f.message };
    }
    // A real byte length: the code derives duration from it, so an empty
    // buffer would silently produce a nonsense duration.
    return { ok: true as const, audioBuffer: Buffer.alloc(24000), contentType: "audio/mpeg" };
  },
}));

const { ensureVoiceSample } = await import("@/lib/voice-sample/ensureVoiceSample");

let service: SupabaseClient;
let reachable = false;
let userId = "";
let profileId = "";
let otherUserId = "";
let otherProfileId = "";
let processingProfileId = "";

async function ping(): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      signal: AbortSignal.timeout(2500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * A voice profile to render from.
 *
 * `status` is set at INSERT, never mutated afterwards: the database enforces
 * monotonic status transitions with a trigger, and `ready -> processing` is
 * rejected outright ("Invalid voice_profile status transition"). A test that
 * wants a non-ready voice needs its own row.
 */
async function seedProfile(
  uid: string,
  status: "ready" | "processing" = "ready"
): Promise<string> {
  const { data, error } = await service
    .from("voice_profiles")
    .insert({
      user_id: uid,
      label: "live-test voice",
      status,
      vendor_voice_id: status === "ready" ? "vv_live_test" : null,
    })
    .select("id")
    .single();
  if (error) throw new Error(`seed failed: ${error.message}`);
  return data.id as string;
}

async function resetSample(id: string) {
  await service
    .from("voice_profiles")
    .update({
      sample_status: "none",
      sample_audio_path: null,
      sample_duration_ms: null,
      sample_line: null,
      sample_render_count: 0,
    })
    .eq("id", id);
}

async function readProfile(id: string) {
  const { data } = await service
    .from("voice_profiles")
    .select("sample_status, sample_audio_path, sample_duration_ms, sample_line, sample_render_count")
    .eq("id", id)
    .single();
  return data!;
}

/** Fixture users, created in SQL — see the header. */
const USER_A = "00000000-0000-4000-8000-000000000001";
const USER_B = "00000000-0000-4000-8000-000000000002";

beforeAll(async () => {
  reachable = SERVICE_KEY.length > 0 && (await ping());
  if (!reachable) return;

  service = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  userId = USER_A;
  otherUserId = USER_B;

  // Start from clean profiles each run rather than accumulating them.
  await service.from("voice_profiles").delete().in("user_id", [USER_A, USER_B]);
  profileId = await seedProfile(userId);
  otherProfileId = await seedProfile(otherUserId);
  processingProfileId = await seedProfile(userId, "processing");
});

afterAll(async () => {
  if (!reachable) return;
  await service.from("voice_profiles").delete().in("user_id", [USER_A, USER_B]);
});

beforeEach(async () => {
  ttsCalls = 0;
  ttsFailOnce = null;
  if (reachable) await resetSample(profileId);
});

const run = (id = profileId, uid = userId) =>
  ensureVoiceSample({
    // The REAL client against the REAL database — that is the point.
    supabase: service as never,
    service: service as never,
    userId: uid,
    voiceProfileId: id,
    requestId: `live-${Math.random().toString(36).slice(2)}`,
    startMs: Date.now(),
  });

describe.runIf(await ping())("ensureVoiceSample against real Postgres", () => {
  it("renders once and persists path, duration and the spoken line", async () => {
    const result = await run();

    expect(result).toMatchObject({ ok: true, rendered: true });
    const row = await readProfile(profileId);
    expect(row.sample_status).toBe("ready");
    expect(row.sample_audio_path).toContain(`voice-profiles/${profileId}/sample.mp3`);
    expect(row.sample_duration_ms).toBeGreaterThan(0);
    // The line is stored, not assumed — the screen typesets what was spoken.
    expect(row.sample_line).toBe("If you're hearing this, I found a way to stay.");
    expect(row.sample_render_count).toBe(1);
    expect(ttsCalls).toBe(1);
  });

  it("row 18 — repeated calls after ready never bill again", async () => {
    await run();
    expect(ttsCalls).toBe(1);

    // Stands in for a refresh, a back-navigation, a double-tap.
    for (let i = 0; i < 5; i++) await run();

    const row = await readProfile(profileId);
    expect(ttsCalls).toBe(1);
    expect(row.sample_render_count).toBe(1);
  });

  it("row 19 — concurrent calls collapse to exactly ONE paid render", async () => {
    // Fired together on purpose: this is the case the unit test cannot express,
    // because the serialization is Postgres's, not the code's.
    const results = await Promise.all([run(), run(), run(), run(), run()]);

    const row = await readProfile(profileId);
    expect(ttsCalls).toBe(1);
    expect(row.sample_render_count).toBe(1);
    expect(row.sample_status).toBe("ready");

    // Exactly one caller should have believed it did the rendering.
    const rendered = results.filter((r) => r.ok && r.rendered);
    expect(rendered).toHaveLength(1);
  });

  it("row 23 — a profile belonging to another user is never touched", async () => {
    const result = await run(otherProfileId, userId);

    expect(result).toEqual({ ok: false, reason: "voice_not_ready" });
    expect(ttsCalls).toBe(0);
    const row = await readProfile(otherProfileId);
    expect(row.sample_status).toBe("none");
  });

  it("row 24 — a vendor failure releases the claim so a retry can re-claim", async () => {
    ttsFailOnce = { status: 502, message: "upstream" };

    const failed = await run();
    expect(failed).toMatchObject({ ok: false, reason: "render_failed" });
    let row = await readProfile(profileId);
    expect(row.sample_status).toBe("failed");
    // A stuck 'rendering' would wedge the beat permanently.
    expect(row.sample_render_count).toBe(1);

    // 'failed' must be re-claimable.
    const retried = await run();
    expect(retried).toMatchObject({ ok: true, rendered: true });
    row = await readProfile(profileId);
    expect(row.sample_status).toBe("ready");
    expect(row.sample_render_count).toBe(2);
  });

  it("a voice that is not ready is never rendered from", async () => {
    // Prove the precondition, so a failure here cannot be misread as the guard
    // being wrong.
    const { data: pre } = await service
      .from("voice_profiles")
      .select("status, vendor_voice_id")
      .eq("id", processingProfileId)
      .single();
    expect(pre).toMatchObject({ status: "processing", vendor_voice_id: null });

    const result = await run(processingProfileId, userId);

    expect(result).toEqual({ ok: false, reason: "voice_not_ready" });
    expect(ttsCalls).toBe(0);
  });
});
