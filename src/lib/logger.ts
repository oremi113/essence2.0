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
 * Emit a structured error log with optional stack trace.
 */
export function logError(
  event: Omit<LogEvent, "outcome"> & { error?: unknown }
): void {
  const stack =
    event.error instanceof Error ? event.error.stack : undefined;
  const message =
    event.error instanceof Error ? event.error.message : String(event.error ?? "");
  console.error(
    JSON.stringify({
      ...event,
      outcome: "error",
      errorMessage: message,
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
