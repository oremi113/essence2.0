/**
 * Step 6 cost controls (Open Contracts Q4).
 *
 * Generation is NOT gated by the saved-message plan quota — a 2/3 user may
 * complete a flow; that race resolves at /save. What IS enforced here are the
 * three cost axes that stop ElevenLabs + LLM spend from being a loophole:
 *
 *   - regenerate cap        — regenerate_count ≤ MAX_REGENERATES   (per generation)
 *   - edit-note depth cap   — edit_note_depth ≤ MAX_EDIT_NOTE_DEPTH (per lineage)
 *   - per-user pending cap   — one active in-flight flow at a time
 *   - per-user hourly cap    — generations per rolling hour
 *
 * All four surface as HTTP 429 with `{ code: 'cost_limit_blocked', limit_kind }`
 * so the client can fire `step6.cost_limit_blocked` (analytics event 14).
 */
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { countRecentEvents } from "@/lib/rate-limit";

function envInt(key: string, fallback: number): number {
  const v = process.env[key];
  if (v != null && v !== "") {
    const n = parseInt(v, 10);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  return fallback;
}

export const STEP6_LIMITS = {
  /** Max user-initiated content re-rolls within one generation (8.7.2). */
  get maxRegenerates() {
    return envInt("STEP6_MAX_REGENERATES", 3);
  },
  /** Max edit-note hops per lineage — closes the regenerate-cap bypass loop. */
  get maxEditNoteDepth() {
    return envInt("STEP6_MAX_EDIT_NOTE_DEPTH", 2);
  },
  /** Max concurrent active (unsaved, unsuperseded) pending rows per user. */
  get maxActivePendingPerUser() {
    return envInt("STEP6_MAX_ACTIVE_PENDING_PER_USER", 1);
  },
  /** Max generations (fresh + regenerate) per rolling hour, per user. */
  get maxGenerationsPerHour() {
    return envInt("STEP6_MAX_GENERATIONS_PER_USER_PER_HOUR", 20);
  },
  /**
   * Lifetime saved-message cap on Vault (MASTER_SPEC 9.4). This is a PLAN quota,
   * not a cost control — enforced at /save as the race-safe security gate, and
   * mirrored by the A2-entry UX gate. Lives here so both surfaces share one number.
   */
  get maxSavedMessages() {
    return envInt("STEP6_MAX_SAVED_MESSAGES", 3);
  },
};

export type CostLimitKind =
  | "regenerate_cap"
  | "edit_note_depth"
  | "pending_max"
  | "hourly_max";

/** usage_events action key counted for the hourly cap. */
export const STEP6_GENERATE_ACTION = "step6_generate";

/**
 * Build the canonical 429 response. The client maps `limit_kind` to calm copy
 * and the `step6.cost_limit_blocked` analytics event.
 */
export function costLimitBlocked(limitKind: CostLimitKind): NextResponse {
  return NextResponse.json(
    { code: "cost_limit_blocked", limit_kind: limitKind },
    { status: 429 },
  );
}

/**
 * Count active in-flight pending rows for a user — drives the pending_max cap.
 * Active = not yet saved and not superseded (matches idx_pending_generations_user_active).
 */
export async function countActivePending(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("pending_generations")
    .select("generation_id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("saved_message_id", null)
    .is("superseded_at", null);

  if (error) {
    console.error("[step6] active pending count failed:", error.message);
    // Fail open — a transient DB error should not wedge the flow.
    return 0;
  }
  return count ?? 0;
}

/**
 * Count generations in the trailing hour for the hourly cap. Reuses the
 * usage_events ledger (recorded with STEP6_GENERATE_ACTION on each generate /
 * variant-regenerate).
 */
export async function countGenerationsThisHour(
  serviceClient: SupabaseClient,
  userId: string,
): Promise<number> {
  return countRecentEvents(serviceClient, userId, STEP6_GENERATE_ACTION, 60 * 60 * 1000);
}
