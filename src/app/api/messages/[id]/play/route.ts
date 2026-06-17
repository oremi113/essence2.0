/**
 * GET /api/messages/:id/play — Short-lived signed URL for message audio playback.
 * Only works for saved messages owned by the authenticated user.
 *
 * Phase 8: DB-backed signed URL rate limit, structured logging.
 */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { logEvent } from "@/lib/logger";
import { checkSignedUrlLimit, assertAllowed, recordUsageEvent } from "@/lib/rate-limit";
import { createPlaybackSignedUrl, PLAYBACK_URL_EXPIRY_SEC } from "@/lib/audio/playback";
import { defineRoute } from "@/lib/api/defineRoute";

export const GET = defineRoute<true, { id: string }>(
  { auth: true },
  async ({ user, requestId, params }) => {
    const { id } = params;
    const supabase = await createSupabaseServerClient();

    // --- DB-backed rate limit ---
    const service = createSupabaseServiceClient();
    const limit = await checkSignedUrlLimit(service, user.id);
    assertAllowed(limit);

    // --- Record usage event ---
    await recordUsageEvent(service, {
      userId: user.id,
      action: "signed_url_playback",
      requestId,
      outcome: "success",
      meta: { messageId: id },
    });

    const { data: message, error } = await supabase
      .from("messages")
      .select("id, user_id, status, storage_bucket, storage_path, played_count")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (message.status !== "saved") {
      return NextResponse.json({ error: "Message audio is not available yet" }, { status: 400 });
    }

    if (!message.storage_bucket || !message.storage_path) {
      return NextResponse.json({ error: "Audio file not found for this message" }, { status: 404 });
    }

    const url = await createPlaybackSignedUrl(
      service,
      message.storage_bucket,
      message.storage_path,
      { event: "play_sign_failed", requestId, userId: user.id, meta: { messageId: id } },
    );

    // Record the play: drives the Memory Shelf's `played` flag (played_count > 0)
    // so the "unheard" glow retires. Issuing the playback URL is the play signal.
    // Best-effort — a counter-write failure must not break playback, and the
    // read-modify-write is fine here (the glow only needs played_count > 0; a
    // rapid-double-play undercount by one is harmless).
    const { error: playedError } = await supabase
      .from("messages")
      .update({
        played_count: (message.played_count ?? 0) + 1,
        last_played_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id);

    if (playedError) {
      logEvent({
        event: "play_count_update_failed",
        requestId,
        userId: user.id,
        messageId: id,
        outcome: "error",
        meta: { message: playedError.message },
      });
    }

    logEvent({
      event: "play_signed_url",
      requestId,
      userId: user.id,
      messageId: id,
      outcome: "success",
    });

    return NextResponse.json({ url, expiresIn: PLAYBACK_URL_EXPIRY_SEC });
  },
);
