/**
 * POST /api/analytics — record a client-side UX event in usage_events.
 *
 * Server-side ledger writes (rate-limit, audit) go through recordUsageEvent
 * directly. This route exists so client components can record funnel events
 * (sequence start/complete, CTA tap, skip) without smuggling Supabase
 * credentials into the browser bundle.
 *
 * Allowlist policy: action must match one of ACTION_PREFIXES. The prefix
 * acts as a namespace — keeps the client from spamming arbitrary actions
 * into the ledger while still letting new screens add events without
 * touching this file.
 *
 * Best-effort by design: returns 204 even on insert failure. The caller
 * uses navigator.sendBeacon and never blocks UX on the response.
 */
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { recordUsageEvent } from "@/lib/rate-limit";
import { logError } from "@/lib/logger";
import { NextResponse } from "next/server";
import { defineRoute } from "@/lib/api/defineRoute";

/** Prefixes that the client is allowed to write through this route. */
const ACTION_PREFIXES = ["breath_stone_", "step6.", "journey."] as const;

function isAllowedAction(action: unknown): action is string {
  return (
    typeof action === "string" &&
    action.length > 0 &&
    action.length <= 80 &&
    ACTION_PREFIXES.some((p) => action.startsWith(p))
  );
}

export const POST = defineRoute({ auth: true }, async ({ request, user, requestId }) => {
  const body = await request.json().catch(() => null);
  const action = body?.action;
  const meta = body?.meta;

  if (!isAllowedAction(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  // Best-effort: the caller uses navigator.sendBeacon and never blocks UX on
  // the response, so a write failure must still return 204 — never surface it
  // as an error the client might retry.
  try {
    const service = createSupabaseServiceClient();
    await recordUsageEvent(service, {
      userId: user.id,
      action,
      requestId,
      outcome: "success",
      meta: meta && typeof meta === "object" ? meta : undefined,
    });
  } catch (err) {
    logError({ event: "analytics.post.failed", requestId, error: err });
  }

  return new NextResponse(null, { status: 204 });
});
