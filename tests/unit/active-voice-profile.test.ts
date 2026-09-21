import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Coverage for `getActiveVoiceProfile` / `getOrCreateVoiceProfile`
 * (FOLLOW_UPS #105).
 *
 * The bug was a *selection* bug, not a logic bug: the helper read the user's
 * voice profile with neither `.neq("status","archived")` nor an ORDER BY,
 * while `/app/record` had both. Two consequences — an archived profile could
 * be handed back as live, and with no ORDER BY Postgres may return any
 * matching row, so `/home` could describe a different profile than the one the
 * record flow resumed into.
 *
 * So what these tests assert is mostly **what the query filtered and ordered
 * on**. A fake that only returns rows would pass against the broken version;
 * the builder below records each clause instead, the same way
 * `ensure-voice-sample.test.ts` records its claim filters. Ordering itself is
 * Postgres's job and is not re-implemented here — the assertion is that the
 * app asked for it.
 */

// ── recorded query state ───────────────────────────────────────────────────

/** Rows the fake "table" returns, already in the order the DB would. */
let rows: Record<string, unknown>[];
/** Every clause the select chain applied, so the guard is only real if used. */
let neq: { col: string; val: string } | null;
let order: { col: string; ascending: boolean } | null;
let eqUserId: string | null;
const inserts: Record<string, unknown>[] = [];
let user: { id: string } | null;

const getUser = vi.fn(async () => ({ data: { user } }));

function makeSupabase() {
  return {
    auth: { getUser },
    from: () => ({
      select: () => {
        const chain = {
          eq: (col: string, val: string) => {
            if (col === "user_id") eqUserId = val;
            return chain;
          },
          neq: (col: string, val: string) => {
            neq = { col, val };
            return chain;
          },
          order: (col: string, opts: { ascending: boolean }) => {
            order = { col, ascending: opts.ascending };
            return chain;
          },
          limit: () => chain,
          maybeSingle: async () => {
            // Mirror what Postgres would do with the recorded clauses, so a
            // helper that forgets one actually fails a test rather than
            // quietly passing on a pre-filtered fixture.
            let out = rows;
            if (neq) out = out.filter((r) => r[neq!.col] !== neq!.val);
            return { data: out[0] ?? null, error: null };
          },
        };
        return chain;
      },
      insert: (payload: Record<string, unknown>) => {
        inserts.push(payload);
        return {
          select: () => ({
            single: async () => ({
              data: { id: "vp_new", status: "created", ...payload },
              error: null,
            }),
          }),
        };
      },
    }),
  };
}

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => makeSupabase(),
}));

const getOrCreateProfileSpy = vi.fn(async () => ({ user_id: "u_1" }));
vi.mock("@/lib/profile/core", () => ({
  getOrCreateProfile: () => getOrCreateProfileSpy(),
}));

import {
  getActiveVoiceProfile,
  getOrCreateVoiceProfile,
} from "@/lib/profile/voice";
import {
  isVoiceProfileRetryAllowed,
  VOICE_PROFILE_BACKOFF_MS,
  VOICE_PROFILE_MAX_ATTEMPTS,
} from "@/lib/voice-training/backoff";

const ARCHIVED = { id: "vp_old", status: "archived", created_at: "2026-01-01" };
const LIVE = { id: "vp_live", status: "collecting", created_at: "2026-06-01" };

beforeEach(() => {
  rows = [];
  neq = null;
  order = null;
  eqUserId = null;
  inserts.length = 0;
  user = { id: "u_1" };
  getUser.mockClear();
  getOrCreateProfileSpy.mockClear();
});

describe("getActiveVoiceProfile", () => {
  it("excludes archived rows — the core of #105", async () => {
    rows = [ARCHIVED];
    expect(await getActiveVoiceProfile()).toBeNull();
    expect(neq).toEqual({ col: "status", val: "archived" });
  });

  it("asks for newest-first, so two callers cannot land on different rows", async () => {
    rows = [LIVE];
    await getActiveVoiceProfile();
    // The /app/record selection this helper replaced ordered the same way.
    expect(order).toEqual({ col: "created_at", ascending: false });
  });

  it("scopes to the authenticated user", async () => {
    rows = [LIVE];
    await getActiveVoiceProfile();
    expect(eqUserId).toBe("u_1");
  });

  it("returns the live profile when one exists", async () => {
    rows = [LIVE, ARCHIVED];
    expect(await getActiveVoiceProfile()).toMatchObject({ id: "vp_live" });
  });

  it("returns null rather than throwing when the user has no profile", async () => {
    rows = [];
    expect(await getActiveVoiceProfile()).toBeNull();
  });

  it("throws without an authenticated user", async () => {
    user = null;
    await expect(getActiveVoiceProfile()).rejects.toThrow(
      /requires an authenticated user/,
    );
  });
});

describe("getOrCreateVoiceProfile", () => {
  it("creates a profile when the only rows are archived", async () => {
    // The #105 regression: an archived row used to suppress creation AND be
    // returned as live, so a user whose voice was discarded was stuck on it.
    rows = [ARCHIVED];
    const result = await getOrCreateVoiceProfile();
    expect(inserts).toHaveLength(1);
    expect(result.id).toBe("vp_new");
  });

  it("returns the existing live profile without inserting", async () => {
    rows = [LIVE];
    const result = await getOrCreateVoiceProfile();
    expect(inserts).toHaveLength(0);
    expect(result).toMatchObject({ id: "vp_live" });
  });

  it("creates when the user has no rows at all", async () => {
    rows = [];
    await getOrCreateVoiceProfile();
    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({ user_id: "u_1", label: "Default" });
  });

  it("ensures the parent profile exists first", async () => {
    // The insert has an FK to profiles; ordering here is load-bearing.
    rows = [LIVE];
    await getOrCreateVoiceProfile();
    expect(getOrCreateProfileSpy).toHaveBeenCalled();
  });
});

// ── retry policy (FOLLOW_UPS #105's neighbour: the same failed-register logic
//    Home A branches on). Pins the two real windows so a fourth cannot sneak
//    back in unnoticed.
describe("voice-profile retry policy", () => {
  it("offers exactly two waits — five minutes and half an hour", () => {
    expect(VOICE_PROFILE_BACKOFF_MS).toEqual([0, 5 * 60 * 1000, 30 * 60 * 1000]);
  });

  it("every backoff index is reachable", () => {
    // attemptCount is capped before the wait is read, so a list longer than
    // the cap has dead entries. This is what removed the old 2h window.
    const reachable = new Set<number>();
    for (let n = 0; n < VOICE_PROFILE_MAX_ATTEMPTS; n++) {
      reachable.add(Math.min(n, VOICE_PROFILE_BACKOFF_MS.length - 1));
    }
    expect(reachable.size).toBe(VOICE_PROFILE_BACKOFF_MS.length);
  });

  it("stops offering a retry at the cap, whatever the clock says", () => {
    const longAgo = new Date(Date.now() - 86_400_000).toISOString();
    expect(isVoiceProfileRetryAllowed(VOICE_PROFILE_MAX_ATTEMPTS, longAgo)).toBe(false);
  });

  it("holds the retry inside the window and releases it after", () => {
    const justNow = new Date(Date.now() - 1000).toISOString();
    const past = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    expect(isVoiceProfileRetryAllowed(1, justNow)).toBe(false); // 5min window
    expect(isVoiceProfileRetryAllowed(1, past)).toBe(true);
  });
});
