import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export interface PersistVoiceReadyInput {
  voiceProfileId: string;
  userId: string;
  voiceId: string;
  completedAt: string;
}

export interface PersistVoiceReadyResult {
  /** True when the monotonic-guarded update actually wrote a row. False means
   *  the guard matched zero rows (row was not "processing" — usually a benign
   *  concurrent finisher). The caller logs the no-op for observability. */
  applied: boolean;
}

/**
 * Persist a successful voice-creation result: flip the profile to `ready` with
 * its `vendor_voice_id`, guarded so it only applies while still `processing`.
 *
 * **Throws on a write error** (FOLLOW_UPS #43). The vendor voice was created and
 * billed; if we can't persist locally the caller must surface a failure rather
 * than tell the client "ready" while the row stays `processing` (it would then
 * drift into the staleness window and read as a timed-out failure after a
 * successful, paid creation).
 */
export async function persistVoiceReady(
  supabase: SupabaseClient<Database>,
  input: PersistVoiceReadyInput,
): Promise<PersistVoiceReadyResult> {
  const { data, error } = await supabase
    .from("voice_profiles")
    .update({
      status: "ready",
      vendor_voice_id: input.voiceId,
      processing_completed_at: input.completedAt,
      ready_at: input.completedAt,
      last_error_code: null,
      last_error_message: null,
      last_error_at: null,
    })
    .eq("id", input.voiceProfileId)
    .eq("user_id", input.userId)
    .eq("status", "processing") // monotonic guard
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to persist voice-ready state: ${error.message}`);
  }

  return { applied: Boolean(data) };
}
