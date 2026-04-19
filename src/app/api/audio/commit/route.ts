/**
 * Step 3 of 3-step pipeline: after client uploaded to signed URL, verify object exists and flip row to uploaded.
 *
 * Phase 8: body size check, structured logging.
 */
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { AUDIO_BUCKET } from "@/lib/audio/storage-paths";
import { NextResponse } from "next/server";
import { logEvent, logError } from "@/lib/logger";
import { defineRoute } from "@/lib/api/defineRoute";
import { audioCommitSchema } from "@/lib/api/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MIN_BYTES = 5 * 1024; // 5KB

export const POST = defineRoute(
  {
    auth: true,
    checkBodySize: true,
    bodySchema: audioCommitSchema,
    invalidBodyResponse: (error) => ({
      body: { error: error.issues[0]?.message ?? "Invalid body" },
      status: 400,
    }),
  },
  async ({ body, user, requestId }) => {
    const supabaseAuth = await createSupabaseServerClient();

    const { id } = body;

    const { data: row, error: fetchError } = await supabaseAuth
      .from("training_clips")
      .select("id, user_id, status, storage_bucket, storage_path, mime_type")
      .eq("id", id)
      .single();

    if (fetchError || !row) {
      return NextResponse.json({ error: "Clip not found" }, { status: 404 });
    }
    if (row.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (row.status !== "uploading") {
      return NextResponse.json({ error: "Clip not in uploading state" }, { status: 400 });
    }

    const bucket = row.storage_bucket || AUDIO_BUCKET;
    const objectPath = row.storage_path;

    const service = createSupabaseServiceClient();
    const { data: blob, error: downloadError } = await service.storage.from(bucket).download(objectPath);

    if (downloadError || !blob) {
      logError({ event: "commit_object_not_found", requestId, userId: user.id, error: downloadError, meta: { objectPath } });
      return NextResponse.json({ error: "Object not found in storage" }, { status: 400 });
    }

    const byteSize = blob.size;
    if (byteSize < MIN_BYTES) {
      return NextResponse.json({ error: "File too small" }, { status: 400 });
    }

    const mime = row.mime_type ?? "audio/webm";
    if (!mime.startsWith("audio/")) {
      return NextResponse.json({ error: "Invalid content type" }, { status: 400 });
    }

    const { error: updateError } = await supabaseAuth
      .from("training_clips")
      .update({ status: "uploaded", bytes: byteSize, mime_type: mime })
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("status", "uploading"); // monotonic guard

    if (updateError) {
      logError({ event: "commit_update_failed", requestId, userId: user.id, error: updateError });
      return NextResponse.json({ error: "Failed to commit", detail: updateError.message }, { status: 500 });
    }

    logEvent({
      event: "commit_success",
      requestId,
      userId: user.id,
      outcome: "success",
      meta: { clipId: id, byteSize },
    });

    return NextResponse.json({ ok: true, status: "uploaded", byteSize });
  }
);
