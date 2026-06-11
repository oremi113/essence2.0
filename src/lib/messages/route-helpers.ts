/**
 * Shared validation helpers for the Step 6 message routes
 * (generate / regenerate / commit).
 *
 * De-duplicates two guards those routes repeated verbatim:
 *  - the pending_generations "still active" check (not saved, not superseded)
 *  - the voice-profile readiness check (cloned vendor voice + status 'ready')
 *
 * The active-check is split from the query on purpose: each route selects its
 * own column set, and Supabase's row typing is inferred from the literal
 * `.select(...)` chain — so extracting the query would erase that inference.
 * Keeping the check separate lets every caller keep its fully-typed query while
 * sharing the one bit of logic (and the error copy/status) that actually drifts.
 *
 * Server-only.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { ErrorCode } from "@/lib/errors";

/**
 * Minimal shape needed to decide whether a loaded pending_generations row is
 * still an active, mutable generation. Reads only the two status columns, so it
 * structurally accepts any richer selected row.
 */
export interface ActivePendingFields {
  saved_message_id: string | null;
  superseded_at: string | null;
}

/**
 * Type guard: true when the row exists and is still an active, mutable
 * generation (not saved, not superseded). Written as a predicate so callers
 * get `gen` narrowed to non-null for the rest of the handler — exactly what the
 * old inline `if (!gen || gen.saved_message_id || gen.superseded_at)` did.
 */
export function isActivePending<T extends ActivePendingFields>(gen: T | null): gen is T {
  return gen !== null && !gen.saved_message_id && !gen.superseded_at;
}

/**
 * The shared 404 for a missing / saved / superseded generation. Centralizes the
 * status code and copy so they can't drift between routes.
 *
 * @param message override for the edit-note path, which says "Prior generation".
 */
export function pendingNotFoundResponse(
  message = "Generation not found or no longer active",
): NextResponse {
  return NextResponse.json(
    { error: message, code: ErrorCode.VALIDATION_ERROR },
    { status: 404 },
  );
}

/**
 * Loads the voice profile for a generation and asserts it is usable (a cloned
 * `vendor_voice_id` and status `'ready'`). regenerate and commit both need this
 * before spending a paid render. Returns the vendor voice id, or a 400
 * NextResponse to return as-is.
 */
export async function loadReadyVoiceProfile(
  supabase: SupabaseClient,
  voiceProfileId: string,
  userId: string,
): Promise<{ ok: true; vendorVoiceId: string } | { ok: false; response: NextResponse }> {
  const { data: profile } = await supabase
    .from("voice_profiles")
    .select("vendor_voice_id, status")
    .eq("id", voiceProfileId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!profile?.vendor_voice_id || profile.status !== "ready") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Voice profile is not ready.", code: ErrorCode.VOICE_NOT_READY },
        { status: 400 },
      ),
    };
  }
  return { ok: true, vendorVoiceId: profile.vendor_voice_id };
}
