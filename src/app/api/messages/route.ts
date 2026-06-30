/**
 * GET /api/messages — List messages for the authed user (Memory Shelf).
 *
 * The legacy `POST /api/messages` create-then-poll handler was removed
 * (FOLLOW_UPS #59): it was orphaned by M0 (the message-creation flow moved
 * to the synchronous Step 6 spine — `/api/messages/generate` →
 * `pending_generations` → `/commit` → `/save`) and, unlike those routes, it
 * carried no STEP6_LIMITS cost cap or per-category voice settings.
 */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { logError } from "@/lib/logger";
import { defineRoute } from "@/lib/api/defineRoute";
import { serializeShelfMessage, type ShelfMessageRow } from "./serializeShelfMessage";

const LIST_LIMIT = 50;

// ---------------------------------------------------------------------------
// GET — List messages (Memory Shelf)
// ---------------------------------------------------------------------------

export const GET = defineRoute(
  { auth: true },
  async ({ user, requestId }) => {
    const supabase = await createSupabaseServerClient();

    // Memory Shelf only displays saved messages; filter at the DB
    // level so we don't ship failed/pending rows the client throws
    // away. If a future caller needs other statuses, add a `?status=`
    // query param rather than broadening the default.
    const { data: messages, error } = await supabase
      .from("messages")
      .select(
        "id, status, title, body_text, category, audio_duration_ms, played_count, created_at, recipient_id, recipients(name)"
      )
      .eq("user_id", user.id)
      .eq("status", "saved")
      .order("created_at", { ascending: false })
      .limit(LIST_LIMIT);

    if (error) {
      logError({ event: "messages_list_error", requestId, userId: user.id, error });
      return NextResponse.json(
        { error: "Could not load messages" },
        { status: 500 }
      );
    }

    const items = ((messages ?? []) as ShelfMessageRow[]).map(
      serializeShelfMessage
    );

    return NextResponse.json({ messages: items });
  }
);
