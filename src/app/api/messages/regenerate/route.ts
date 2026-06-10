/**
 * POST /api/messages/regenerate — re-roll within an existing generation.
 *
 * Two modes (Open Contracts Q2):
 *  - "variant"      user "Regenerate": pick a DIFFERENT template variant, re-run
 *                   LLM + audio, increment regenerate_count (capped at
 *                   MAX_REGENERATES). Counts as a generation for the hourly cap.
 *  - "retry_audio"  system retry after an audio-only failure: reuse the cached
 *                   generated_text + same variant, re-run audio only. Does NOT
 *                   touch regenerate_count and is not counted as a generation.
 */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { ErrorCode } from "@/lib/errors";
import { logEvent, logError, durationSince } from "@/lib/logger";
import { recordUsageEvent } from "@/lib/rate-limit";
import { defineRoute } from "@/lib/api/defineRoute";
import { messageRegenerateSchema } from "@/lib/api/schemas";
import { normalizeRelationship, type MessageCategory } from "@/lib/messageTemplates";
import { selectVariantByIndex, generateMessageText } from "@/lib/messages/generation";
import { generateAndStoreAudio } from "@/lib/messages/audio";
import {
  STEP6_LIMITS,
  STEP6_GENERATE_ACTION,
  costLimitBlocked,
  countGenerationsThisHour,
} from "@/lib/messages/cost-controls";

export const maxDuration = 120; // 2 min — LLM insert + TTS + upload

export const POST = defineRoute(
  {
    auth: true,
    checkBodySize: true,
    bodySchema: messageRegenerateSchema,
    dedup: { action: "step6_regenerate", event: "step6_regenerate_dedup" },
  },
  async ({ body, user, requestId }) => {
    const startMs = Date.now();
    const supabase = await createSupabaseServerClient();
    const service = createSupabaseServiceClient();
    const { generationId, mode } = body;

    // --- Load the active pending row ----------------------------------------
    const { data: gen } = await supabase
      .from("pending_generations")
      .select(
        "generation_id, voice_profile_id, category, template_variant, generated_text, regenerate_count, recipient_id, pending_recipient_relationship, pending_recipient_descriptor, note, saved_message_id, superseded_at",
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

    // Voice id for TTS (also confirms the profile is still usable).
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

    // --- retry_audio: reuse cached text, audio only -------------------------
    if (mode === "retry_audio") {
      if (!gen.generated_text) {
        return NextResponse.json(
          { error: "No generated text to retry audio for.", code: ErrorCode.VALIDATION_ERROR },
          { status: 409 },
        );
      }

      await supabase
        .from("pending_generations")
        .update({ audio_status: "pending" })
        .eq("generation_id", generationId)
        .eq("user_id", user.id);

      const audio = await generateAndStoreAudio({
        supabase,
        service,
        userId: user.id,
        generationId,
        voiceId: profile.vendor_voice_id,
        text: gen.generated_text,
        requestId,
        startMs,
      });

      return NextResponse.json(
        {
          generationId,
          textStatus: "succeeded",
          audioStatus: audio.ok ? "succeeded" : "failed",
          regenerateCount: gen.regenerate_count,
          ...(audio.ok ? {} : { error: "Could not generate audio. Please try again.", code: audio.code, retryable: true }),
        },
        { status: audio.ok ? 200 : 502 },
      );
    }

    // --- variant: user-initiated content re-roll ----------------------------
    const nextCount = gen.regenerate_count + 1;
    if (nextCount > STEP6_LIMITS.maxRegenerates) {
      return costLimitBlocked("regenerate_cap");
    }

    if ((await countGenerationsThisHour(service, user.id)) >= STEP6_LIMITS.maxGenerationsPerHour) {
      return costLimitBlocked("hourly_max");
    }

    // Resolve relationship for variant selection (existing recipient vs typed).
    let relationshipRaw: string | null = gen.pending_recipient_relationship;
    if (gen.recipient_id) {
      const { data: rec } = await supabase
        .from("recipients")
        .select("relationship")
        .eq("id", gen.recipient_id)
        .eq("user_id", user.id)
        .maybeSingle();
      relationshipRaw = rec?.relationship ?? null;
    }
    const relationship = normalizeRelationship(relationshipRaw);
    const category = gen.category as MessageCategory;

    // A different variant from the prior one (index keyed to the new count).
    const variant = selectVariantByIndex(category, relationship, nextCount);

    await recordUsageEvent(service, {
      userId: user.id,
      action: STEP6_GENERATE_ACTION,
      requestId,
      outcome: "started",
      meta: { generationId, regenerate: true, regenerateCount: nextCount },
    });

    // Bump the count + new variant, reset statuses before regenerating.
    const { error: bumpError } = await supabase
      .from("pending_generations")
      .update({
        regenerate_count: nextCount,
        template_variant: variant.id,
        text_status: "pending",
        audio_status: "pending",
      })
      .eq("generation_id", generationId)
      .eq("user_id", user.id);

    if (bumpError) {
      logError({ event: "step6_regenerate_bump_failed", requestId, userId: user.id, error: bumpError });
      return NextResponse.json(
        { error: "Could not regenerate", code: ErrorCode.INTERNAL_ERROR, retryable: true },
        { status: 500 },
      );
    }

    const textResult = await generateMessageText({
      template: variant,
      category,
      relationship,
      descriptor: gen.pending_recipient_descriptor,
      note: gen.note,
    });

    if (!textResult.ok) {
      await supabase
        .from("pending_generations")
        .update({ text_status: "failed" })
        .eq("generation_id", generationId)
        .eq("user_id", user.id);
      return NextResponse.json(
        {
          generationId,
          textStatus: "failed",
          audioStatus: "pending",
          regenerateCount: nextCount,
          error: "Could not shape your message. Please try again.",
          code: ErrorCode.INTERNAL_ERROR,
          retryable: true,
        },
        { status: 502 },
      );
    }

    await supabase
      .from("pending_generations")
      .update({ generated_text: textResult.text, text_status: "succeeded" })
      .eq("generation_id", generationId)
      .eq("user_id", user.id);

    const audio = await generateAndStoreAudio({
      supabase,
      service,
      userId: user.id,
      generationId,
      voiceId: profile.vendor_voice_id,
      text: textResult.text,
      requestId,
      startMs,
    });

    logEvent({
      event: "step6_regenerate_complete",
      requestId,
      userId: user.id,
      outcome: audio.ok ? "success" : "error",
      durationMs: durationSince(startMs),
      meta: { generationId, regenerateCount: nextCount, variant: variant.id },
    });

    return NextResponse.json(
      {
        generationId,
        textStatus: "succeeded",
        audioStatus: audio.ok ? "succeeded" : "failed",
        regenerateCount: nextCount,
        ...(audio.ok ? {} : { error: "Could not generate audio. Please try again.", code: audio.code, retryable: true }),
      },
      { status: audio.ok ? 200 : 502 },
    );
  },
);
