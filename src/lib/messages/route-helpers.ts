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
import { bestEffortWrite } from "@/lib/supabase/checked-write";

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
    { error: message, code: ErrorCode.VALIDATION_ERROR, retryable: false },
    { status: 404 },
  );
}

/**
 * Retire a pending_generations row that ended in terminal failure, releasing the
 * per-user active-pending slot it claimed at insert.
 *
 * The cold-start `/generate` path inserts the row *before* text/audio run and
 * counts it toward `maxActivePendingPerUser` (one active flow per user). When a
 * generation then fails, the row is neither saved nor superseded, so
 * `countActivePending` keeps counting it as an in-flight flow — the failed
 * attempt permanently occupies the user's single slot and every retry
 * (a fresh cold-start) 429s with `pending_max` forever (FOLLOW_UPS #93).
 *
 * Stamping `superseded_at` is exactly the "no longer an active, mutable
 * generation" flag every reader already honours — `isActivePending`,
 * `countActivePending`, and the g/[id] view guard all treat a superseded row as
 * retired — so a failed attempt correctly stops counting and can't be reopened.
 * `fields` folds a terminal status (e.g. `text_status: "failed"`) into the same
 * write so the row also records *why* it was retired.
 *
 * Best-effort: a terminal failure is already being returned to the client, and a
 * failed cleanup write must not mask it. Server-only.
 */
export async function retireFailedPendingGeneration(
  supabase: SupabaseClient,
  args: {
    generationId: string;
    userId: string;
    requestId?: string;
    fields?: Record<string, unknown>;
  },
): Promise<boolean> {
  const { generationId, userId, requestId, fields } = args;
  return bestEffortWrite(
    supabase
      .from("pending_generations")
      .update({ superseded_at: new Date().toISOString(), ...fields })
      .eq("generation_id", generationId)
      .eq("user_id", userId),
    { op: "step6_retire_failed_pending", requestId, userId, meta: { generationId } },
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
        { error: "Voice profile is not ready.", code: ErrorCode.VOICE_NOT_READY, retryable: false },
        { status: 400 },
      ),
    };
  }
  return { ok: true, vendorVoiceId: profile.vendor_voice_id };
}
