/**
 * POST /api/messages/commit — "Hear this in your voice" (Amendment A1).
 *
 * Renders the current uncommitted candidate text and promotes it to the
 * committed take. This is the only Deferred-Audio action that spends a paid
 * voice render. Capped at MAX_AUDIO_RENDERS (audio_render_cap).
 *
 * Failure handling (A1 §5.5): a failed render must leave the prior committed
 * take intact and must NOT consume a render allowance. We achieve that by
 * rendering first and only writing the committed fields / bumping
 * audio_render_count AFTER both the TTS and the upload succeed. A failed TTS
 * never uploads; a failed upsert upload leaves the existing committed object
 * intact (Supabase does not delete on error) — so the committed audio survives
 * either way, and audio_status is never flipped to 'failed' on the committed row.
 */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { generateSpeech } from "@/lib/elevenlabs";
import { AUDIO_BUCKET, pendingGenerationAudioPath } from "@/lib/audio/storage-paths";
import { NextResponse } from "next/server";
import { ErrorCode } from "@/lib/errors";
import { logEvent, durationSince } from "@/lib/logger";
import { defineRoute } from "@/lib/api/defineRoute";
import { messageGenerationRefSchema } from "@/lib/api/schemas";
import { getCategoryVoiceSettings, type MessageCategory } from "@/lib/messageTemplates";
import { STEP6_LIMITS, costLimitBlocked } from "@/lib/messages/cost-controls";

export const maxDuration = 120; // 2 min — TTS + upload

export const POST = defineRoute(
  {
    auth: true,
    checkBodySize: true,
    bodySchema: messageGenerationRefSchema,
    dedup: { action: "step6_commit", event: "step6_commit_dedup" },
  },
  async ({ body, user, requestId }) => {
    const startMs = Date.now();
    const supabase = await createSupabaseServerClient();
    const service = createSupabaseServiceClient();
    const { generationId } = body;

    // --- Load the active pending row ----------------------------------------
    const { data: gen } = await supabase
      .from("pending_generations")
      .select(
        "generation_id, voice_profile_id, category, candidate_text, candidate_template_variant, audio_render_count, saved_message_id, superseded_at",
      )
      .eq("generation_id", generationId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!gen || gen.saved_message_id || gen.superseded_at) {
      return NextResponse.json(
        { error: "Generation not found or no longer active", code: ErrorCode.VALIDATION_ERROR },
        { status: 404 },
      );
    }

    // Nothing to commit — no candidate is being previewed.
    if (!gen.candidate_text || !gen.candidate_template_variant) {
      return NextResponse.json(
        { error: "No candidate to commit.", code: ErrorCode.VALIDATION_ERROR },
        { status: 409 },
      );
    }

    // --- Audio-render cap (A1 §A1.6) ----------------------------------------
    if (gen.audio_render_count >= STEP6_LIMITS.maxAudioRenders) {
      return costLimitBlocked("audio_render_cap");
    }

    // --- Voice profile must still be usable ---------------------------------
    const { data: profile } = await supabase
      .from("voice_profiles")
      .select("vendor_voice_id, status")
      .eq("id", gen.voice_profile_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!profile?.vendor_voice_id || profile.status !== "ready") {
      return NextResponse.json(
        { error: "Voice profile is not ready.", code: ErrorCode.VOICE_NOT_READY },
        { status: 400 },
      );
    }

    // --- Render the candidate. Nothing committed-touching happens until both
    //     the TTS and the upload succeed (A1 §5.5). -------------------------
    const tts = await generateSpeech({
      voiceId: profile.vendor_voice_id,
      text: gen.candidate_text,
      voiceSettings: getCategoryVoiceSettings(gen.category as MessageCategory),
    });

    if (!tts.ok) {
      // Committed take is untouched; allowance not consumed. Offer retry.
      const code = tts.status === 504 ? ErrorCode.TTS_TIMEOUT : ErrorCode.TTS_FAILED;
      logEvent({
        event: "step6_commit_failed",
        requestId,
        userId: user.id,
        outcome: "error",
        errorCode: code,
        durationMs: durationSince(startMs),
        meta: { generationId, ttsStatus: tts.status },
      });
      return NextResponse.json(
        { generationId, committed: false, error: "Could not record this take. Please try again.", code, retryable: true },
        { status: 502 },
      );
    }

    const audioPath = pendingGenerationAudioPath(user.id, generationId);
    const { error: uploadError } = await service.storage
      .from(AUDIO_BUCKET)
      .upload(audioPath, tts.audioBuffer, { contentType: "audio/mpeg", upsert: true });

    if (uploadError) {
      // Old committed object remains (upsert does not delete on error).
      return NextResponse.json(
        { generationId, committed: false, error: "Could not save this take. Please try again.", code: ErrorCode.STORAGE_FAILED, retryable: true },
        { status: 502 },
      );
    }

    // --- Success: promote candidate -> committed, bump the render count -----
    const nextRenderCount = gen.audio_render_count + 1;
    await supabase
      .from("pending_generations")
      .update({
        generated_text: gen.candidate_text,
        template_variant: gen.candidate_template_variant,
        audio_path: audioPath,
        audio_status: "succeeded",
        text_status: "succeeded",
        audio_render_count: nextRenderCount,
        candidate_text: null,
        candidate_template_variant: null,
      })
      .eq("generation_id", generationId)
      .eq("user_id", user.id);

    logEvent({
      event: "step6_commit_complete",
      requestId,
      userId: user.id,
      outcome: "success",
      durationMs: durationSince(startMs),
      meta: { generationId, audioRenderCount: nextRenderCount },
    });

    return NextResponse.json({
      generationId,
      committed: true,
      audioStatus: "succeeded",
      audioRenderCount: nextRenderCount,
    });
  },
);
