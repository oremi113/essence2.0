import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

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
  fromStatus: string = "processing"
): Promise<void> {
  await supabase
    .from("voice_profiles")
    .update({
      status: "failed",
      last_error_code: code,
      last_error_message: message,
      last_error_at: new Date().toISOString(),
    })
    .eq("id", voiceProfileId)
    .eq("user_id", userId)
    .eq("status", fromStatus);
}
