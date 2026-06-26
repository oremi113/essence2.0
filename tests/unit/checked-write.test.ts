import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { PostgrestError } from "@supabase/supabase-js";
import { checkedWrite, bestEffortWrite } from "@/lib/supabase/checked-write";
import { AppError } from "@/lib/errors";

/**
 * Coverage for the durable fix to the unchecked-Supabase-write bug class
 * (FOLLOW_UPS #42/#43/#44/#45/#46/#61/#62/#63/#64). A Supabase write reports
 * failure via the returned `{ error }` rather than throwing, so these
 * primitives are the one place that turns a failed (or zero-row) write into a
 * loud throw / logged swallow.
 */

/** A resolved Supabase-write-shaped value, as a thenable. */
function resolves(value: { data?: unknown; error?: Partial<PostgrestError> | null }) {
  return Promise.resolve({ data: null, error: null, ...value } as {
    data: unknown;
    error: PostgrestError | null;
  });
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("checkedWrite", () => {
  it("returns data on a successful write", async () => {
    const data = [{ id: "1" }];
    await expect(checkedWrite(resolves({ data }), { op: "test.ok" })).resolves.toBe(data);
  });

  it("throws an AppError when the write returns an error", async () => {
    await expect(
      checkedWrite(resolves({ error: { message: "boom" } }), { op: "test.err" }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("carries the configured status/retryable/code onto the thrown AppError", async () => {
    const err = (await checkedWrite(resolves({ error: { message: "boom" } }), {
      op: "test.shape",
      status: 502,
      retryable: true,
      code: "CUSTOM_CODE",
    }).catch((e: unknown) => e)) as AppError;
    expect(err).toBeInstanceOf(AppError);
    expect(err.status).toBe(502);
    expect(err.retryable).toBe(true);
    expect(err.code).toBe("CUSTOM_CODE");
  });

  it("expectRows: resolves when at least one row matched", async () => {
    await expect(
      checkedWrite(resolves({ data: [{ user_id: "u1" }] }), { op: "test.rows", expectRows: true }),
    ).resolves.toEqual([{ user_id: "u1" }]);
  });

  it("expectRows: throws when zero rows matched (the #63 no-op)", async () => {
    await expect(
      checkedWrite(resolves({ data: [] }), { op: "test.zero", expectRows: true }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("expectRows: throws a programmer-error when .select() was forgotten (data not an array)", async () => {
    const err = (await checkedWrite(resolves({ data: null }), {
      op: "test.noselect",
      expectRows: true,
    }).catch((e: unknown) => e)) as AppError;
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe("INTERNAL_ERROR");
    expect((err.cause as Error)?.message).toMatch(/requires a \.select\(\)/i);
  });
});

describe("bestEffortWrite", () => {
  it("returns true and never throws on success", async () => {
    await expect(bestEffortWrite(resolves({}), { op: "test.be.ok" })).resolves.toBe(true);
  });

  it("returns false and never throws on error (failure must not mask the caller's)", async () => {
    await expect(
      bestEffortWrite(resolves({ error: { message: "swallowed" } }), { op: "test.be.err" }),
    ).resolves.toBe(false);
  });
});
