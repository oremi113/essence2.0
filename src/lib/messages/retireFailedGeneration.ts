/**
 * Retire a just-created `pending_generations` row that failed to render.
 *
 * Cold-start `POST /api/messages/generate` inserts the pending row *before* the
 * LLM text and ElevenLabs audio run. If either then fails, the route returns a
 * failed/retryable response but the row stays **active** — `saved_message_id`
 * and `superseded_at` both null — which is exactly what `countActivePending`
 * counts (`cost-controls.ts`). With `maxActivePendingPerUser` defaulting to 1,
 * that orphan makes the very next cold start (the A5 "Try again", which re-POSTs
 * a fresh `/generate`) hit the `pending_max` 429 — and so does every future
 * message, permanently, until the row is cleared. Nothing else supersedes a
 * failed row: `superseded_at` is otherwise only stamped on an edit-note success
 * (FOLLOW_UPS #93).
 *
 * Stamping `superseded_at` retires the failed row so it stops counting, curing
 * the wedge at its source. The failed row is kept (not deleted) with its
 * `*_status: "failed"` intact for observability; superseded simply means "no
 * longer an active, mutable generation" (`isActivePending`).
 *
 * Best-effort by design: this runs on an error path that is already returning a
 * failed/retryable response, so a lost cleanup write must not throw over the
 * failure it is cleaning up after (it is logged instead). `.is('saved_message_id',
 * null)` is defensive — an in-flight failed render cannot have been saved, but
 * it guarantees this can never retire a saved generation — and the `user_id`
 * scope guarantees it can never touch another user's row.
 *
 * Server-only.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { bestEffortWrite } from "@/lib/supabase/checked-write";

export interface RetireFailedGenerationParams {
  generationId: string;
  userId: string;
  requestId: string;
  /**
   * Extra columns to fold into the same update — e.g. `{ text_status: "failed" }`
   * so the text-failure branch records the failure and retires the row in one
   * write instead of two.
   */
  extra?: Record<string, unknown>;
}

export async function retireFailedGeneration(
  supabase: SupabaseClient,
  { generationId, userId, requestId, extra }: RetireFailedGenerationParams,
): Promise<void> {
  await bestEffortWrite(
    supabase
      .from("pending_generations")
      .update({ superseded_at: new Date().toISOString(), ...extra })
      .eq("generation_id", generationId)
      .eq("user_id", userId)
      .is("saved_message_id", null),
    { op: "step6_retire_failed_generation", requestId, userId, meta: { generationId } },
  );
}
