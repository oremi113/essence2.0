/**
 * Shared signing core for the playback-URL routes.
 *
 * The saved-message route (`/api/messages/:id/play`) and the pending-generation
 * route (`/api/messages/generations/:id/play`) each do their own row load +
 * ownership/status validation — those genuinely differ (different tables,
 * status semantics, error codes). What they share is the tail: mint a
 * short-lived signed URL for a resolved {bucket, path} and handle a signing
 * failure identically. That's extracted here, along with the one expiry
 * constant, so the two routes can't drift on it.
 *
 * Server-only.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError, ErrorCode } from "@/lib/errors";
import { logError } from "@/lib/logger";

/** Signed-URL lifetime for audio playback. */
export const PLAYBACK_URL_EXPIRY_SEC = 120; // 2 minutes

/**
 * Create a short-lived signed URL for `{bucket, path}`. Throws
 * STORAGE_FAILED (500, retryable) if Supabase can't sign — the caller's
 * defineRoute/try-catch turns that into the standard error envelope. The
 * `failureLog` fields keep each route's existing structured-log event name and
 * identifier so log shapes are unchanged.
 */
export async function createPlaybackSignedUrl(
  service: SupabaseClient,
  bucket: string,
  path: string,
  failureLog: {
    event: string;
    requestId: string;
    userId: string;
    meta?: Record<string, unknown>;
  },
): Promise<string> {
  const { data: signed, error } = await service.storage
    .from(bucket)
    .createSignedUrl(path, PLAYBACK_URL_EXPIRY_SEC);

  if (error || !signed?.signedUrl) {
    logError({
      event: failureLog.event,
      requestId: failureLog.requestId,
      userId: failureLog.userId,
      error,
      ...(failureLog.meta ? { meta: failureLog.meta } : {}),
    });
    throw new AppError(ErrorCode.STORAGE_FAILED, "Could not generate playback URL", 500, true);
  }

  return signed.signedUrl;
}
