/**
 * Step 3 of 3-step pipeline: after client uploaded to signed URL, verify object exists and flip row to ready.
 */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { AUDIO_BUCKET } from "@/lib/audio/storage-paths";
import { NextResponse } from "next/server";

const MIN_BYTES = 5 * 1024; // 5KB

export async function POST(request: Request) {
  try {
    const supabaseAuth = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const kind = body?.kind;
    const id = body?.id;

    if (kind !== "training_clip") {
      return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
    }
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

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
    if (row.status !== "pending_upload" && row.status !== "failed") {
      return NextResponse.json({ error: "Clip not in pending_upload or failed state" }, { status: 400 });
    }

    const bucket = row.storage_bucket || AUDIO_BUCKET;
    const objectPath = row.storage_path;

    const service = createSupabaseServiceClient();
    const { data: blob, error: downloadError } = await service.storage.from(bucket).download(objectPath);

    if (downloadError || !blob) {
      console.error("[commit] object not found at", objectPath, downloadError?.message);
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
      .update({ status: "ready", bytes: byteSize, mime_type: mime })
      .eq("id", id)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("[commit] update failed:", updateError.message);
      return NextResponse.json({ error: "Failed to commit" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, status: "ready", byteSize });
  } catch (err) {
    console.error("[commit]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
