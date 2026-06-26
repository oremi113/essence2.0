/**
 * Checked Supabase writes — the durable fix for a recurring bug class.
 *
 * Supabase reports a failed write through the returned `{ error }`, it does
 * **not** throw. So a write whose result is discarded resolves as success no
 * matter what the database did. That single oversight has produced the same
 * bug over and over (FOLLOW_UPS #42, #43, #44, #45, #46, #62, #63, #64): a
 * route tells the client "saved / ready / succeeded" while the row never
 * changed — lost onboarding profiles, un-bumped cost counters, orphaned audio.
 *
 * Every write should go through one of the two primitives here so the
 * result-handling is explicit at the call site:
 *
 *   - `checkedWrite(builder, ctx)`   — the default. Throws on a failed write,
 *     and (with `expectRows`) on a no-op write that matched zero rows. Returns
 *     the affected rows when `.select(...)` was chained.
 *
 *   - `bestEffortWrite(builder, ctx)` — the deliberate opt-out, for writes that
 *     must not mask a more important failure already in flight: error-path
 *     status flips (`audio_status:"failed"`), best-effort telemetry. Awaits,
 *     logs on error, never throws.
 *
 * The local ESLint rule `no-unchecked-supabase-write` enforces that a write's
 * result can't simply be discarded — it has to be checked, or routed through
 * one of these (which makes the intent legible in review).
 *
 * Server-only. These throw `AppError`, which route handlers already translate
 * into `{ error, code, retryable }` via `handleRouteError`.
 */
import type { PostgrestError } from "@supabase/supabase-js";
import { AppError, ErrorCode } from "@/lib/errors";
import { logError } from "@/lib/logger";

/**
 * The shape every Supabase write resolves to. A bare `.update().eq()` resolves
 * `data: null`; chaining `.select(...)` resolves `data: Row[]`. Storage
 * `.upload()` / `.remove()` resolve the same `{ data, error }` envelope, so
 * they flow through here too.
 */
type WriteResult<T> = { data: T; error: PostgrestError | null };

export type WriteContext = {
  /**
   * Stable identifier for the write, e.g. `"onboarding.completion"` or
   * `"step6.generate.text_succeeded"`. Used as the log `event` and folded into
   * the thrown error's cause so a failure is traceable to the exact site.
   */
  op: string;
  requestId?: string;
  userId?: string;
  messageId?: string;
  /** Extra structured context for the log line. Never include raw PII. */
  meta?: Record<string, unknown>;
};

type CheckedWriteOptions = WriteContext & {
  /**
   * Throw when the write matched **zero rows** (PostgREST returns
   * `error: null` for a predicate that hits nothing — the silent no-op that
   * #63 is about). Requires `.select(...)` chained on the builder so the
   * affected rows come back as an array; throwing on `!Array.isArray(data)`
   * guards against forgetting it.
   */
  expectRows?: boolean;
  /** User-facing message for the thrown AppError. Defaults to a generic line. */
  userMessage?: string;
  /** Error code for the thrown AppError. Defaults to STORAGE_FAILED. */
  code?: string;
  /** HTTP status for the thrown AppError. Defaults to 500. */
  status?: number;
  /** Whether the client should offer retry. Defaults to false. */
  retryable?: boolean;
};

/**
 * Await a Supabase write and throw if it failed (or, with `expectRows`,
 * if it matched no rows). Returns the resolved `data` so it doubles as the
 * "I need the inserted/updated row back" primitive.
 */
export async function checkedWrite<T>(
  builder: PromiseLike<WriteResult<T>>,
  options: CheckedWriteOptions,
): Promise<T> {
  const {
    op,
    requestId,
    userId,
    messageId,
    meta,
    expectRows = false,
    userMessage = "Could not save your changes. Please try again.",
    code = ErrorCode.STORAGE_FAILED,
    status = 500,
    retryable = false,
  } = options;

  const { data, error } = await builder;

  if (error) {
    logError({ event: op, requestId: requestId ?? "", userId, messageId, errorCode: code, error, meta });
    throw new AppError(code, userMessage, status, retryable, error);
  }

  if (expectRows) {
    if (!Array.isArray(data)) {
      // Programmer error — `expectRows` needs `.select(...)` on the builder so
      // affected rows come back. Fail loud rather than silently skip the check.
      throw new AppError(
        ErrorCode.INTERNAL_ERROR,
        userMessage,
        500,
        false,
        new Error(`checkedWrite(${op}): expectRows requires a .select() on the write`),
      );
    }
    if (data.length === 0) {
      logError({
        event: op,
        requestId: requestId ?? "",
        userId,
        messageId,
        errorCode: code,
        error: new Error("write matched zero rows"),
        meta: { ...meta, zeroRows: true },
      });
      throw new AppError(code, userMessage, status, retryable);
    }
  }

  return data;
}

/**
 * Await a Supabase write whose failure should NOT throw — error-path status
 * flips and best-effort telemetry that must not mask the failure already being
 * handled. Logs on error and swallows. Returns whether the write landed, for
 * the rare caller that wants to know.
 */
export async function bestEffortWrite(
  builder: PromiseLike<WriteResult<unknown>>,
  context: WriteContext,
): Promise<boolean> {
  const { op, requestId, userId, messageId, meta } = context;
  const { error } = await builder;
  if (error) {
    logError({ event: op, requestId: requestId ?? "", userId, messageId, error, meta });
    return false;
  }
  return true;
}
