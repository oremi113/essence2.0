/**
 * Structured JSON logging for ESSENCE.
 * Outputs JSON lines that Vercel parses natively.
 *
 * PII rules (hard):
 * - Log: prompt_length, prompt_hash, message_type
 * - NEVER log: raw prompt text, recipient names, body text, audio content
 * - ALWAYS log: request_id, user_id, route, duration_ms, error_code
 */
import { createHash } from "crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LogOutcome = "success" | "error" | "rejected";

export type LogEvent = {
  event: string;
  requestId: string;
  route?: string;
  userId?: string;
  voiceProfileId?: string;
  messageId?: string;
  durationMs?: number;
  outcome: LogOutcome;
  errorCode?: string;
  /** Additional metadata — NEVER include raw text / PII */
  meta?: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// Core
// ---------------------------------------------------------------------------

/**
 * Emit a structured log event as a JSON line.
 * Automatically appends ISO timestamp.
 */
export function logEvent(event: LogEvent): void {
  console.log(JSON.stringify({ ...event, ts: new Date().toISOString() }));
}

/**
 * Pull a useful message out of whatever `error` shape we're handed.
 * Supabase's PostgrestError is a plain object with `.message / .code /
 * .details / .hint` — not an Error instance — so the naive
 * `instanceof Error` path was stringifying it to "[object Object]".
 */
function extractError(err: unknown): {
  errorMessage: string;
  errorCode?: string;
  errorDetails?: string;
  stack?: string;
} {
  if (err instanceof Error) {
    return { errorMessage: err.message, stack: err.stack };
  }
  if (err && typeof err === "object") {
    const e = err as {
      message?: unknown;
      code?: unknown;
      details?: unknown;
      hint?: unknown;
    };
    if (typeof e.message === "string") {
      return {
        errorMessage: e.message,
        errorCode: typeof e.code === "string" ? e.code : undefined,
        errorDetails:
          typeof e.details === "string"
            ? e.details
            : typeof e.hint === "string"
              ? e.hint
              : undefined,
      };
    }
    try {
      return { errorMessage: JSON.stringify(err) };
    } catch {
      return { errorMessage: "[unserializable error]" };
    }
  }
  return { errorMessage: String(err ?? "") };
}

/**
 * Emit a structured error log with optional stack trace.
 */
export function logError(
  event: Omit<LogEvent, "outcome"> & { error?: unknown }
): void {
  const { errorMessage, errorCode, errorDetails, stack } = extractError(event.error);
  console.error(
    JSON.stringify({
      ...event,
      outcome: "error",
      errorMessage,
      errorCode: event.errorCode ?? errorCode,
      errorDetails,
      stack,
      error: undefined, // strip the Error object from JSON
      ts: new Date().toISOString(),
    })
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a unique request ID */
export function generateRequestId(): string {
  return crypto.randomUUID();
}

/** Hash prompt text for logging (SHA-256, never log raw text) */
export function hashPrompt(text: string): string {
  return createHash("sha256").update(text.trim()).digest("hex").slice(0, 16);
}

/** Compute duration from a start time */
export function durationSince(startMs: number): number {
  return Date.now() - startMs;
}

// ---------------------------------------------------------------------------
// Response header helper
// ---------------------------------------------------------------------------

/** Add x-request-id header to a Response (or NextResponse) */
export function withRequestId(
  response: Response,
  requestId: string
): Response {
  response.headers.set("x-request-id", requestId);
  return response;
}
