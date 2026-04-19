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
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { recordUsageEvent } from "@/lib/rate-limit";
import { generateRequestId, logError, withRequestId } from "@/lib/logger";
import { NextResponse } from "next/server";

/** Prefixes that the client is allowed to write through this route. */
const ACTION_PREFIXES = ["breath_stone_"] as const;

function isAllowedAction(action: unknown): action is string {
  return (
    typeof action === "string" &&
    action.length > 0 &&
    action.length <= 80 &&
    ACTION_PREFIXES.some((p) => action.startsWith(p))
  );
}

export async function POST(request: Request) {
  const requestId = generateRequestId();
  try {
    const auth = await createSupabaseServerClient();
    const {
      data: { user },
    } = await auth.auth.getUser();
    if (!user) {
      return withRequestId(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        requestId
      );
    }

    const body = await request.json().catch(() => null);
    const action = body?.action;
    const meta = body?.meta;

    if (!isAllowedAction(action)) {
      return withRequestId(
        NextResponse.json({ error: "Invalid action" }, { status: 400 }),
        requestId
      );
    }

    const service = createSupabaseServiceClient();
    await recordUsageEvent(service, {
      userId: user.id,
      action,
      requestId,
      outcome: "success",
      meta: meta && typeof meta === "object" ? meta : undefined,
    });

    return withRequestId(new NextResponse(null, { status: 204 }), requestId);
  } catch (err) {
    logError({ event: "analytics.post.failed", requestId, error: err });
    // Even on failure: 204 to keep the client from retrying a best-effort event.
    return withRequestId(new NextResponse(null, { status: 204 }), requestId);
  }
}
