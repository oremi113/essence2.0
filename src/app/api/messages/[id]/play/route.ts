/**
 * GET /api/messages/:id/play — Short-lived signed URL for message audio playback.
 * Only works for saved messages owned by the authenticated user.
 *
 * Phase 8: DB-backed signed URL rate limit, structured logging.
 */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/errors";
import { logEvent, logError, generateRequestId, withRequestId } from "@/lib/logger";
import { checkSignedUrlLimit, assertAllowed, recordUsageEvent } from "@/lib/rate-limit";

const DOWNLOAD_EXPIRY_SEC = 120; // 2 minutes

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();

  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return withRequestId(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        requestId
      );
    }

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
      .select("id, user_id, status, storage_bucket, storage_path")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !message) {
      return withRequestId(
        NextResponse.json({ error: "Message not found" }, { status: 404 }),
        requestId
      );
    }

    if (message.status !== "saved") {
      return withRequestId(
        NextResponse.json({ error: "Message audio is not available yet" }, { status: 400 }),
        requestId
      );
    }

    if (!message.storage_bucket || !message.storage_path) {
      return withRequestId(
        NextResponse.json({ error: "Audio file not found for this message" }, { status: 404 }),
        requestId
      );
    }

    const { data: signed, error: signError } = await service.storage
      .from(message.storage_bucket)
      .createSignedUrl(message.storage_path, DOWNLOAD_EXPIRY_SEC);

    if (signError || !signed?.signedUrl) {
      logError({ event: "play_sign_failed", requestId, userId: user.id, messageId: id, error: signError });
      return withRequestId(
        NextResponse.json({ error: "Could not generate playback URL" }, { status: 500 }),
        requestId
      );
    }

    logEvent({
      event: "play_signed_url",
      requestId,
      userId: user.id,
      messageId: id,
      outcome: "success",
    });

    return withRequestId(
      NextResponse.json({ url: signed.signedUrl, expiresIn: DOWNLOAD_EXPIRY_SEC }),
      requestId
    );
  } catch (err) {
    const { body, status } = handleRouteError(err, requestId);
    return withRequestId(NextResponse.json(body, { status }), requestId);
  }
}
