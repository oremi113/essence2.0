/**
 * Return a short-lived signed download URL for training clip playback.
 * Client uses <audio src={url} />.
 *
 * Phase 8: DB-backed signed URL rate limit, structured logging.
 */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { assertBodySize, handleRouteError } from "@/lib/errors";
import { logEvent, logError, generateRequestId, withRequestId } from "@/lib/logger";
import { checkSignedUrlLimit, assertAllowed, recordUsageEvent } from "@/lib/rate-limit";

const DOWNLOAD_EXPIRY_SEC = 120; // 2 min

export async function POST(request: Request) {
  const requestId = generateRequestId();

  try {
    // --- Body size check ---
    assertBodySize(request);

    const supabaseAuth = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();
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

    const body = await request.json();
    const kind = body?.kind;
    const id = body?.id;

    if (kind !== "training_clip") {
      return withRequestId(
        NextResponse.json({ error: "Invalid kind" }, { status: 400 }),
        requestId
      );
    }
    if (!id) {
      return withRequestId(
        NextResponse.json({ error: "id required" }, { status: 400 }),
        requestId
      );
    }

    // --- Record usage event ---
    await recordUsageEvent(service, {
      userId: user.id,
      action: "signed_url_playback",
      requestId,
      outcome: "success",
      meta: { clipId: id },
    });

    const { data: row, error: fetchError } = await supabaseAuth
      .from("training_clips")
      .select("id, user_id, status, storage_bucket, storage_path")
      .eq("id", id)
      .single();

    if (fetchError || !row) {
      return withRequestId(
        NextResponse.json({ error: "Clip not found" }, { status: 404 }),
        requestId
      );
    }
    if (row.user_id !== user.id) {
      return withRequestId(
        NextResponse.json({ error: "Forbidden" }, { status: 403 }),
        requestId
      );
    }
    if (row.status !== "uploaded") {
      return withRequestId(
        NextResponse.json({ error: "Clip not ready for playback" }, { status: 400 }),
        requestId
      );
    }

    if (!row.storage_bucket || !row.storage_path) {
      return withRequestId(
        NextResponse.json({ error: "Audio file not found" }, { status: 404 }),
        requestId
      );
    }

    const { data: signed, error: signError } = await service.storage
      .from(row.storage_bucket)
      .createSignedUrl(row.storage_path, DOWNLOAD_EXPIRY_SEC);

    if (signError) {
      logError({ event: "playback_url_sign_failed", requestId, userId: user.id, error: signError });
      return withRequestId(
        NextResponse.json({ error: "Failed to create playback URL" }, { status: 500 }),
        requestId
      );
    }

    logEvent({
      event: "playback_url_success",
      requestId,
      userId: user.id,
      outcome: "success",
      meta: { clipId: id },
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
