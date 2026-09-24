import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { bestEffortWrite } from "@/lib/supabase/checked-write";

/**
 * Atomically transition a voice profile to `failed` with the given
 * error code + message, but ONLY if it's still in the source status
 * (defaults to "processing"). The eq("status", ...) clause is the
 * monotonic guard that prevents racing against a concurrent finalize
 * or another retry.
 *
 * Used by every error path in /api/voice-profiles/[id]/start so the
 * "mark failed" pattern lives in one place. Five+ duplicate sites
 * collapse to one helper.
 */
export async function markVoiceProfileFailed(
  supabase: SupabaseClient,
  voiceProfileId: string,
  userId: string,
  code: string,
  message: string,
  fromStatus: string = "processing",
  opts: {
    /**
     * Write `attempt_count` back to this value in the same update.
     *
     * The lock increments `attempt_count` before the vendor call, because that
     * is what makes the start single-flight. When the failure turns out to be
     * the operator's — a full account, a rejected key — that increment charged
     * the user for our problem, and the third one would have bricked their
     * profile for good. Rolling it back here rather than in a second write
     * keeps the status flip and the refund atomic, so the two can never be
     * observed disagreeing.
     */
    restoreAttemptCount?: number;
  } = {}
): Promise<void> {
  // Best-effort: the monotonic `.eq("status", fromStatus)` guard means this
  // legitimately matches zero rows when a concurrent finalize/retry already
  // moved the profile — that's not an error to surface. And it runs on error
  // paths, where a failed flip must not mask the failure being handled.
  await bestEffortWrite(
    supabase
      .from("voice_profiles")
      .update({
        status: "failed",
        last_error_code: code,
        last_error_message: message,
        last_error_at: new Date().toISOString(),
        ...(opts.restoreAttemptCount !== undefined && {
          attempt_count: opts.restoreAttemptCount,
        }),
      })
      .eq("id", voiceProfileId)
      .eq("user_id", userId)
      .eq("status", fromStatus),
    {
      op: "voice_profile_mark_failed",
      userId,
      meta: {
        voiceProfileId,
        code,
        fromStatus,
        ...(opts.restoreAttemptCount !== undefined && {
          restoredAttemptCount: opts.restoreAttemptCount,
        }),
      },
    },
  );
}
