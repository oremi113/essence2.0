/**
 * Step 1 of 3-step pipeline: create DB row (uploading), compute path, return signed upload URL.
 * Client will PUT to the URL then call POST /api/audio/commit.
 *
 * Phase 8: clip cap guard, body size check, structured logging.
 * V2 Script: sequential prompt enforcement (1..25), upper-bound cap,
 *            optional resolved_variant_keys for debugging.
 */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { AUDIO_BUCKET, trainingClipObjectPath } from "@/lib/audio/storage-paths";
import { NextResponse } from "next/server";
import { logEvent, logError } from "@/lib/logger";
import { assertCanUploadClip } from "@/lib/guards";
import { recordUsageEvent } from "@/lib/rate-limit";
import { TOTAL_PROMPT_COUNT } from "@/lib/voice-training/script";
import { defineRoute } from "@/lib/api/defineRoute";

const UPLOAD_URL_EXPIRY_SEC = 60 * 10; // 10 min

export const POST = defineRoute(
  { auth: true, checkBodySize: true },
  async ({ request, user, requestId }) => {
    const supabaseAuth = await createSupabaseServerClient();

    const body = await request.json();
    const kind = body?.kind;
    const voiceProfileId = body?.voiceProfileId;
    const promptId = body?.promptId ?? body?.prompt_index;
    const mime = body?.mime ?? "audio/webm";
    // Optional: resolved variant keys for debugging (client-provided, not authoritative)
    const resolvedVariantKeys =
      body?.resolvedVariantKeys && typeof body.resolvedVariantKeys === "object"
        ? body.resolvedVariantKeys
        : null;

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

    // --- Upper bound: V2 script has exactly 25 prompts ---
    if (promptIndex > TOTAL_PROMPT_COUNT) {
      return NextResponse.json(
        { error: "PROMPT_OUT_OF_RANGE", detail: `promptId must be between 1 and ${TOTAL_PROMPT_COUNT}` },
        { status: 400 }
      );
    }

    // --- Centralized guard: ownership + clip cap ---
    await assertCanUploadClip(supabaseAuth, user.id, voiceProfileId);

    // --- Sequential prompt enforcement ---
    // Query the highest committed prompt_index for this voice profile.
    // Only "uploaded" clips count as committed.
    const { data: maxRow } = await supabaseAuth
      .from("training_clips")
      .select("prompt_index")
      .eq("voice_profile_id", voiceProfileId)
      .eq("status", "uploaded")
      .order("prompt_index", { ascending: false })
      .limit(1)
      .maybeSingle();

    const expectedNext = (maxRow?.prompt_index ?? 0) + 1;
    if (promptIndex !== expectedNext) {
      return NextResponse.json(
        {
          error: "PROMPT_OUT_OF_ORDER",
          detail: `Expected prompt ${expectedNext}, got ${promptIndex}`,
          expectedNext,
        },
        { status: 400 }
      );
    }

    // --- Record usage event ---
    const service = createSupabaseServiceClient();
    await recordUsageEvent(service, {
      userId: user.id,
      action: "signed_url_upload",
      requestId,
      outcome: "success",
      meta: { voiceProfileId, promptIndex },
    });

    // Clear any stale "uploading" row
    await supabaseAuth
      .from("training_clips")
      .delete()
      .eq("user_id", user.id)
      .eq("voice_profile_id", voiceProfileId)
      .eq("prompt_index", promptIndex)
      .eq("status", "uploading");

    // Insert row
    const { data: row, error: insertError } = await supabaseAuth
      .from("training_clips")
      .insert({
        user_id: user.id,
        voice_profile_id: voiceProfileId,
        prompt_index: promptIndex,
        status: "uploading",
        storage_bucket: AUDIO_BUCKET,
        storage_path: "pending",
        ...(resolvedVariantKeys ? { resolved_variant_keys: resolvedVariantKeys } : {}),
      })
      .select("id")
      .single();

    if (insertError) {
      logError({ event: "init_upload_insert_failed", requestId, userId: user.id, voiceProfileId, error: insertError });
      return NextResponse.json({ error: "Failed to create clip", detail: insertError.message }, { status: 500 });
    }

    const clipId = row.id;
    const ext = mime.includes("webm") ? "webm" : "webm";
    const objectPath = trainingClipObjectPath(user.id, voiceProfileId, clipId, ext);

    await supabaseAuth
      .from("training_clips")
      .update({ storage_path: objectPath, mime_type: mime })
      .eq("id", clipId);

    const { data: signData, error: signError } = await service.storage
      .from(AUDIO_BUCKET)
      .createSignedUploadUrl(objectPath);

    if (signError) {
      logError({ event: "init_upload_sign_failed", requestId, userId: user.id, voiceProfileId, error: signError });
      return NextResponse.json({ error: "Failed to create upload URL" }, { status: 500 });
    }

    const expiresAt = new Date(Date.now() + UPLOAD_URL_EXPIRY_SEC * 1000).toISOString();

    logEvent({
      event: "init_upload_success",
      requestId,
      userId: user.id,
      voiceProfileId,
      outcome: "success",
      meta: { clipId, promptIndex },
    });

    return NextResponse.json({
      id: clipId,
      objectPath,
      signedUploadUrl: signData.signedUrl,
      uploadToken: signData.token,
      requiredHeaders: { "Content-Type": mime },
      expiresAt,
    });
  }
);
