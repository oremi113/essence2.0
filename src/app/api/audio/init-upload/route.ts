/**
 * Step 1 of 3-step pipeline: create DB row (pending_upload), compute path, return signed upload URL.
 * Client will PUT to the URL then call POST /api/audio/commit.
 */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { AUDIO_BUCKET, trainingClipObjectPath } from "@/lib/audio/storage-paths";
import { NextResponse } from "next/server";

const UPLOAD_URL_EXPIRY_SEC = 60 * 10; // 10 min

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
    const voiceProfileId = body?.voiceProfileId;
    const promptId = body?.promptId ?? body?.prompt_index;
    const mime = body?.mime ?? "audio/webm";

    if (kind !== "training_clip") {
      return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
    }
    if (!voiceProfileId || typeof voiceProfileId !== "string") {
      return NextResponse.json({ error: "voiceProfileId required" }, { status: 400 });
    }
    const promptIndex = promptId != null ? Number(promptId) : undefined;
    if (promptIndex == null || !Number.isInteger(promptIndex) || promptIndex < 1) {
      return NextResponse.json({ error: "promptId (prompt_index) required and must be >= 1" }, { status: 400 });
    }

    // Insert row first so we have an id for the path (deterministic path includes id)
    const { data: row, error: insertError } = await supabaseAuth
      .from("training_clips")
      .insert({
        user_id: user.id,
        voice_profile_id: voiceProfileId,
        prompt_index: promptIndex,
        status: "pending_upload",
        storage_bucket: AUDIO_BUCKET,
        storage_path: "pending", // required NOT NULL; set to real path below
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[init-upload] insert failed:", insertError.message);
      return NextResponse.json({ error: "Failed to create clip" }, { status: 500 });
    }

    const clipId = row.id;
    const ext = mime.includes("webm") ? "webm" : "webm";
    const objectPath = trainingClipObjectPath(user.id, voiceProfileId, clipId, ext);

    // Update row with final storage_path
    await supabaseAuth
      .from("training_clips")
      .update({ storage_path: objectPath, mime_type: mime })
      .eq("id", clipId);

    const service = createSupabaseServiceClient();
    const { data: signData, error: signError } = await service.storage
      .from(AUDIO_BUCKET)
      .createSignedUploadUrl(objectPath);

    if (signError) {
      console.error("[init-upload] signed URL failed:", signError.message);
      return NextResponse.json({ error: "Failed to create upload URL" }, { status: 500 });
    }

    const expiresAt = new Date(Date.now() + UPLOAD_URL_EXPIRY_SEC * 1000).toISOString();

    return NextResponse.json({
      id: clipId,
      objectPath,
      signedUploadUrl: signData.signedUrl,
      uploadToken: signData.token,
      requiredHeaders: { "Content-Type": mime },
      expiresAt,
    });
  } catch (err) {
    console.error("[init-upload]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
