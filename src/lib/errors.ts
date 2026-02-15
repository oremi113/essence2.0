/**
 * Centralized error classification for ESSENCE.
 * All route handlers catch AppError and return { error, code, retryable }.
 * Unknown errors return generic 500 with no internals leaked.
 */

// ---------------------------------------------------------------------------
// AppError
// ---------------------------------------------------------------------------

export class AppError extends Error {
  constructor(
    /** Machine-readable error code (e.g. "RATE_LIMIT_EXCEEDED") */
    public code: string,
    /** Safe user-facing message — never contains internals */
    public userMessage: string,
    /** HTTP status code */
    public status: number,
    /** Whether the client should offer retry */
    public retryable: boolean,
    /** Optional root cause (logged server-side, never sent to client) */
    public cause?: unknown
  ) {
    super(userMessage);
    this.name = "AppError";
  }
}

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

export const ErrorCode = {
  // Rate limiting
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  DAILY_LIMIT_REACHED: "DAILY_LIMIT_REACHED",
  CLIP_LIMIT_REACHED: "CLIP_LIMIT_REACHED",

  // Validation
  VALIDATION_ERROR: "VALIDATION_ERROR",
  BODY_TOO_LARGE: "BODY_TOO_LARGE",

  // Voice / generation
  VOICE_NOT_READY: "VOICE_NOT_READY",
  VOICE_NOT_FOUND: "VOICE_NOT_FOUND",
  TTS_FAILED: "TTS_FAILED",
  TTS_TIMEOUT: "TTS_TIMEOUT",
  STORAGE_FAILED: "STORAGE_FAILED",

  // Idempotency
  IDEMPOTENT_DUPLICATE: "IDEMPOTENT_DUPLICATE",

  // Auth / permissions
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",

  // Internal
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a JSON response body from an AppError */
export function appErrorToJson(err: AppError) {
  return {
    error: err.userMessage,
    code: err.code,
    retryable: err.retryable,
  };
}

/**
 * Standard catch handler for route try/catch blocks.
 * Returns AppError JSON for known errors, generic 500 for unknown.
 */
export function handleRouteError(err: unknown, requestId?: string) {
  if (err instanceof AppError) {
    return { body: appErrorToJson(err), status: err.status };
  }

  // Unknown error — log stack server-side, return generic message
  const message = err instanceof Error ? err.message : "Unknown error";
  const stack = err instanceof Error ? err.stack : undefined;
  console.error(
    JSON.stringify({
      event: "unhandled_route_error",
      requestId,
      message,
      stack,
      ts: new Date().toISOString(),
    })
  );

  return {
    body: {
      error: "Something went wrong. Please try again.",
      code: ErrorCode.INTERNAL_ERROR,
      retryable: false,
    },
    status: 500,
  };
}

// ---------------------------------------------------------------------------
// Body size check
// ---------------------------------------------------------------------------

const MAX_BODY_BYTES = 50 * 1024; // 50 KB

export function assertBodySize(request: Request): void {
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
    throw new AppError(
      ErrorCode.BODY_TOO_LARGE,
      "Request too large.",
      413,
      false
    );
  }
}
