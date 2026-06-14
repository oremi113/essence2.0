/**
 * POST /api/messages/waitlist — join the Legacy waitlist (C2).
 *
 * Inserts one `legacy_waitlist` row per user (unique user_id). Idempotent: a
 * second join (already on the list, e.g. arrived via C3 again) is NOT an
 * error — we return 200 so the screen shows its "you're on the list" success
 * either way. Feature picks are NOT persisted here — they ride the client's
 * `step6.waitlist_joined` telemetry per the C2 data-model decision; this row
 * is just the durable "who joined" signal (email + source).
 *
 * RLS: the user inserts their own row (policy "users can join the waitlist",
 * with check auth.uid() = user_id), so the server client is sufficient — no
 * service-role escalation.
 *
 * Append-only by design: the table has no client UPDATE policy (insert-only),
 * so on a re-join we do NOT change the stored email even if the user edited it.
 * First join wins; the durable row is the first email they confirmed. (Editable
 * email + append-only storage is an accepted V1 tradeoff — changing it would
 * need an UPDATE policy + migration, which the migration lock defers.)
 */
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { defineRoute } from "@/lib/api/defineRoute";
import { waitlistJoinSchema } from "@/lib/api/schemas";
import { logEvent, logError } from "@/lib/logger";

const UNIQUE_VIOLATION = "23505";

export const POST = defineRoute(
  {
    auth: true,
    checkBodySize: true,
    bodySchema: waitlistJoinSchema,
  },
  async ({ body, user, requestId }) => {
    const supabase = await createSupabaseServerClient();
    const { email, source } = body;

    const { error } = await supabase.from("legacy_waitlist").insert({
      user_id: user.id,
      email,
      // Only override the column default when we have real attribution.
      ...(source ? { source } : {}),
    });

    if (error) {
      // Already on the list — append-only + unique(user_id). Treat as success
      // (the user's intent is satisfied; the screen should celebrate, not error).
      if (error.code === UNIQUE_VIOLATION) {
        logEvent({
          event: "waitlist_join_idempotent",
          requestId,
          userId: user.id,
          outcome: "success",
        });
        return NextResponse.json({ ok: true, alreadyJoined: true });
      }
      logError({ event: "waitlist_join_failed", requestId, userId: user.id, error });
      return NextResponse.json(
        { error: "Could not join the waitlist", code: "retryable", retryable: true },
        { status: 500 },
      );
    }

    logEvent({
      event: "waitlist_joined",
      requestId,
      userId: user.id,
      outcome: "success",
    });
    return NextResponse.json({ ok: true, alreadyJoined: false });
  },
);
