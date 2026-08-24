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

/** Where in the cold-start pipeline a generation failed — for the discard log. */
export type FailedGenerationStage = "text" | "text_mark" | "audio";

/**
 * Discard a cold-start generation whose pending row was created but whose
 * text/audio render then failed. Stamps `superseded_at` so the orphaned row
 * stops counting as an active in-flight flow (`countActivePending` in
 * cost-controls treats a row as active only while both `saved_message_id` and
 * `superseded_at` are null).
 *
 * Without this, a single transient LLM/TTS failure on `POST /generate` leaves
 * an active, unsaveable row occupying the one-active-flow slot forever: the A5
 * "Try again" fires a fresh cold-start `POST /generate`, which trips
 * `pending_max` (429) — wedging not just the retry but every future message.
 * (Follow-up `2026-07-10-a-failed-message-generation-permanently-wedges-creation-the`.)
 *
 * Scoped to the cold-start `/generate` lifecycle on purpose. `POST /regenerate`
 * deliberately leaves its row active on failure — there the row is the flow the
 * user is already inside (A6) and is recoverable via `retry_audio`; the
 * cold-start client never returns to this `generationId`, so leaving it active
 * only harms. The shared `generateAndStoreAudio` helper is likewise untouched,
 * preserving that recoverability.
 *
 * Best-effort: a failed supersede must not mask the generation failure already
 * being returned to the client, so it logs and swallows rather than throwing.
 * The `saved_message_id` null-guard mirrors the lineage-supersede write so a row
 * saved by a concurrent request is never clobbered.
 */
export async function discardFailedGeneration(
  supabase: SupabaseClient,
  args: { generationId: string; userId: string; requestId: string; stage: FailedGenerationStage },
): Promise<void> {
  await bestEffortWrite(
    supabase
      .from("pending_generations")
      .update({ superseded_at: new Date().toISOString() })
      .eq("generation_id", args.generationId)
      .eq("user_id", args.userId)
      .is("saved_message_id", null),
    {
      op: "step6_discard_failed_generation",
      requestId: args.requestId,
      userId: args.userId,
      meta: { generationId: args.generationId, stage: args.stage },
    },
  );
}
