/**
 * Return a short-lived signed download URL for training clip playback.
 * Client uses <audio src={url} />.
 *
 * Phase 8: DB-backed signed URL rate limit, structured logging.
 */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { logEvent, logError } from "@/lib/logger";
import { checkSignedUrlLimit, assertAllowed, recordUsageEvent } from "@/lib/rate-limit";
import { defineRoute } from "@/lib/api/defineRoute";

const DOWNLOAD_EXPIRY_SEC = 120; // 2 min

export const POST = defineRoute(
  { auth: true, checkBodySize: true },
  async ({ request, user, requestId }) => {
    const supabaseAuth = await createSupabaseServerClient();

    // --- DB-backed rate limit ---
    const service = createSupabaseServiceClient();
    const limit = await checkSignedUrlLimit(service, user.id);
    assertAllowed(limit);

    const body = await request.json();
    const kind = body?.kind;
    const id = body?.id;

    if (kind !== "training_clip") {
      return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
    }
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
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
      return NextResponse.json({ error: "Clip not found" }, { status: 404 });
    }
    if (row.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (row.status !== "uploaded") {
      return NextResponse.json({ error: "Clip not ready for playback" }, { status: 400 });
    }

    if (!row.storage_bucket || !row.storage_path) {
      return NextResponse.json({ error: "Audio file not found" }, { status: 404 });
    }

    const { data: signed, error: signError } = await service.storage
      .from(row.storage_bucket)
      .createSignedUrl(row.storage_path, DOWNLOAD_EXPIRY_SEC);

    if (signError) {
      logError({ event: "playback_url_sign_failed", requestId, userId: user.id, error: signError });
      return NextResponse.json({ error: "Failed to create playback URL" }, { status: 500 });
    }

    logEvent({
      event: "playback_url_success",
      requestId,
      userId: user.id,
      outcome: "success",
      meta: { clipId: id },
    });

    return NextResponse.json({ url: signed.signedUrl, expiresIn: DOWNLOAD_EXPIRY_SEC });
  },
);
