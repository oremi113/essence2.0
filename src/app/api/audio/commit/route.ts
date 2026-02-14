/**
 * Step 3 of 3-step pipeline: after client uploaded to signed URL, verify object exists and flip row to uploaded.
 *
 * Phase 8: body size check, structured logging.
 */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { AUDIO_BUCKET } from "@/lib/audio/storage-paths";
import { NextResponse } from "next/server";
import { assertBodySize, handleRouteError } from "@/lib/errors";
import { logEvent, logError, generateRequestId, withRequestId } from "@/lib/logger";

const MIN_BYTES = 5 * 1024; // 5KB

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

    const { data: row, error: fetchError } = await supabaseAuth
      .from("training_clips")
      .select("id, user_id, status, storage_bucket, storage_path, mime_type")
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
    if (row.status !== "uploading") {
      return withRequestId(
        NextResponse.json({ error: "Clip not in uploading state" }, { status: 400 }),
        requestId
      );
    }

    const bucket = row.storage_bucket || AUDIO_BUCKET;
    const objectPath = row.storage_path;

    const service = createSupabaseServiceClient();
    const { data: blob, error: downloadError } = await service.storage.from(bucket).download(objectPath);

    if (downloadError || !blob) {
      logError({ event: "commit_object_not_found", requestId, userId: user.id, error: downloadError, meta: { objectPath } });
      return withRequestId(
        NextResponse.json({ error: "Object not found in storage" }, { status: 400 }),
        requestId
      );
    }

    const byteSize = blob.size;
    if (byteSize < MIN_BYTES) {
      return withRequestId(
        NextResponse.json({ error: "File too small" }, { status: 400 }),
        requestId
      );
    }

    const mime = row.mime_type ?? "audio/webm";
    if (!mime.startsWith("audio/")) {
      return withRequestId(
        NextResponse.json({ error: "Invalid content type" }, { status: 400 }),
        requestId
      );
    }

    const { error: updateError } = await supabaseAuth
      .from("training_clips")
      .update({ status: "uploaded", bytes: byteSize, mime_type: mime })
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("status", "uploading"); // monotonic guard

    if (updateError) {
      logError({ event: "commit_update_failed", requestId, userId: user.id, error: updateError });
      return withRequestId(
        NextResponse.json({ error: "Failed to commit", detail: updateError.message }, { status: 500 }),
        requestId
      );
    }

    logEvent({
      event: "commit_success",
      requestId,
      userId: user.id,
      outcome: "success",
      meta: { clipId: id, byteSize },
    });

    return withRequestId(
      NextResponse.json({ ok: true, status: "uploaded", byteSize }),
      requestId
    );
  } catch (err) {
    const { body, status } = handleRouteError(err, requestId);
    return withRequestId(NextResponse.json(body, { status }), requestId);
  }
}
