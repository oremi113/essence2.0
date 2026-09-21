/**
 * POST /api/messages/regenerate — re-roll within an existing generation.
 *
 * Two modes (Open Contracts Q2):
 *  - "variant"      user "Regenerate": pick a DIFFERENT template variant, re-run
 *                   LLM + audio, increment regenerate_count (capped at
 *                   MAX_REGENERATES). Counts as a generation for the hourly cap.
 *  - "retry_audio"  system retry after an audio-only failure: reuse the cached
 *                   generated_text + same variant, re-run audio only. Does NOT
 *                   touch regenerate_count, but IS bounded by the hourly cost cap
 *                   and ledgered as a paid render (FOLLOW_UPS #92); a render that
 *                   already succeeded is never re-billed (idempotent no-op).
 */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { ErrorCode } from "@/lib/errors";
import { logEvent, logError, durationSince } from "@/lib/logger";
import { recordUsageEvent } from "@/lib/rate-limit";
import { defineRoute } from "@/lib/api/defineRoute";
import { messageRegenerateSchema } from "@/lib/api/schemas";
import { normalizeRelationship, getCategoryVoiceSettings, type MessageCategory } from "@/lib/messageTemplates";
import { selectVariantByIndex, generateMessageText } from "@/lib/messages/generation";
import { generateAndStoreAudio } from "@/lib/messages/audio";
import { bestEffortWrite } from "@/lib/supabase/checked-write";
import { isActivePending, pendingNotFoundResponse, loadReadyVoiceProfile } from "@/lib/messages/route-helpers";
import {
  STEP6_LIMITS,
  STEP6_GENERATE_ACTION,
  costLimitBlocked,
  countGenerationsThisHour,
  isDeferredAudioEnabled,
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
        "generation_id, voice_profile_id, category, template_variant, generated_text, audio_status, regenerate_count, text_reroll_count, audio_render_count, recipient_id, pending_recipient_relationship, pending_recipient_descriptor, note, saved_message_id, superseded_at",
      )
      .eq("generation_id", generationId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!isActivePending(gen)) return pendingNotFoundResponse();

    // --- keep: discard the un-heard candidate, keep the committed take ------
    // Deferred-Audio "Keep the current one" (A6). Nulls the candidate_*
    // columns so a later server-side rehydrate doesn't resurface a candidate
    // the user already dismissed. Spends nothing — no voice profile needed, no
    // LLM, no TTS — so it runs before the profile check below. Idempotent: a
    // no-op when no candidate is present.
    if (mode === "keep") {
      // Best-effort: clearing the dismissed candidate is idempotent and a failed
      // clear only risks a stale candidate resurfacing on rehydrate (FOLLOW_UPS
      // #31's harmless-replay case) — never blocks the user's "keep" choice.
      await bestEffortWrite(
        supabase
          .from("pending_generations")
          .update({ candidate_text: null, candidate_template_variant: null })
          .eq("generation_id", generationId)
          .eq("user_id", user.id),
        { op: "step6_candidate_keep_clear", requestId, userId: user.id, meta: { generationId } },
      );
      logEvent({
        event: "step6_candidate_kept",
        requestId,
        userId: user.id,
        outcome: "success",
        durationMs: durationSince(startMs),
        meta: { generationId },
      });
      return NextResponse.json({ generationId, candidate: false });
    }

    // Voice id for TTS (also confirms the profile is still usable).
    const voice = await loadReadyVoiceProfile(supabase, gen.voice_profile_id, user.id);
    if (!voice.ok) return voice.response;

    // --- retry_audio: reuse cached text, audio only -------------------------
    if (mode === "retry_audio") {
      if (!gen.generated_text) {
        return NextResponse.json(
          { error: "No generated text to retry audio for.", code: ErrorCode.VALIDATION_ERROR, retryable: false },
          { status: 409 },
        );
      }

      // Idempotent: never re-bill a succeeded render. retry_audio exists to
      // retry a FAILED audio render; calling it on a row whose audio already
      // succeeded would spend ElevenLabs money to reproduce audio the user
      // already has — and, looped, is the unbounded-spend hole (FOLLOW_UPS #92).
      // No-op straight back to success; no reset, no render, no ledger row.
      if (gen.audio_status === "succeeded") {
        return NextResponse.json({
          generationId,
          textStatus: "succeeded",
          audioStatus: "succeeded",
          regenerateCount: gen.regenerate_count,
        });
      }

      // Hourly cost backstop. Unlike the control arm ~100 lines below,
      // retry_audio shipped with NO cap, gate, or ledger — a signed-in client
      // could loop it to rack up unbounded paid renders, evading even the 20/hr
      // hourly_max (FOLLOW_UPS #92). Gate it on, and count it toward, the same
      // rolling-hour ceiling every other paid render already respects.
      if ((await countGenerationsThisHour(service, user.id)) >= STEP6_LIMITS.maxGenerationsPerHour) {
        return costLimitBlocked("hourly_max");
      }

      // Ledger the paid render before it runs — this is also the row the hourly
      // count above reads, so retry_audio can no longer slip the cap unrecorded.
      await recordUsageEvent(service, {
        userId: user.id,
        action: STEP6_GENERATE_ACTION,
        requestId,
        outcome: "started",
        meta: { generationId, retryAudio: true },
      });

      // Best-effort reset: generateAndStoreAudio below re-marks audio_status on
      // its own success/failure, so a lost reset here is overwritten anyway.
      await bestEffortWrite(
        supabase
          .from("pending_generations")
          .update({ audio_status: "pending" })
          .eq("generation_id", generationId)
          .eq("user_id", user.id),
        { op: "step6_retry_audio_reset", requestId, userId: user.id, meta: { generationId } },
      );

      const audio = await generateAndStoreAudio({
        supabase,
        service,
        userId: user.id,
        generationId,
        voiceId: voice.vendorVoiceId,
        text: gen.generated_text,
        requestId,
        startMs,
        voiceSettings: getCategoryVoiceSettings(gen.category as MessageCategory),
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
    // Resolve relationship + category for variant selection (both arms need them).
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

    // === Deferred Audio (A1): produce a free TEXT candidate, no render ======
    // "Try another" — new variant text into candidate_*, bump text_reroll_count,
    // leave the committed take (generated_text/audio_path/audio_status) intact.
    if (isDeferredAudioEnabled()) {
      const nextReroll = gen.text_reroll_count + 1;
      if (nextReroll > STEP6_LIMITS.maxTextRerolls) {
        return costLimitBlocked("text_reroll_cap");
      }
      const candidateVariant = selectVariantByIndex(category, relationship, nextReroll);
      const candidateText = await generateMessageText({
        template: candidateVariant,
        category,
        relationship,
        descriptor: gen.pending_recipient_descriptor,
        note: gen.note,
      });
      if (!candidateText.ok) {
        return NextResponse.json(
          { generationId, candidate: false, error: "Could not shape your message. Please try again.", code: ErrorCode.INTERNAL_ERROR, retryable: true },
          { status: 502 },
        );
      }
      const { error: candidateError } = await supabase
        .from("pending_generations")
        .update({
          candidate_text: candidateText.text,
          candidate_template_variant: candidateVariant.id,
          text_reroll_count: nextReroll,
        })
        .eq("generation_id", generationId)
        .eq("user_id", user.id);

      if (candidateError) {
        // The candidate text rendered but persisting it failed — don't tell the
        // client `candidate: true` for a re-roll the row never stored, or
        // /commit finds nothing to promote (FOLLOW_UPS #61). Same failed/
        // retryable shape the text-failure branch above uses.
        logError({ event: "step6_candidate_write_failed", requestId, userId: user.id, error: candidateError, meta: { generationId, textRerollCount: nextReroll } });
        return NextResponse.json(
          { generationId, candidate: false, error: "Could not shape your message. Please try again.", code: ErrorCode.INTERNAL_ERROR, retryable: true },
          { status: 502 },
        );
      }
      logEvent({
        event: "step6_variant_previewed",
        requestId,
        userId: user.id,
        outcome: "success",
        durationMs: durationSince(startMs),
        meta: { generationId, textRerollCount: nextReroll, variant: candidateVariant.id },
      });
      return NextResponse.json({
        generationId,
        candidate: true,
        candidateText: candidateText.text,
        textRerollCount: nextReroll,
        audioRenderCount: gen.audio_render_count,
      });
    }

    // === Control arm: text + audio together, regenerate_count++ =============
    const nextCount = gen.regenerate_count + 1;
    if (nextCount > STEP6_LIMITS.maxRegenerates) {
      return costLimitBlocked("regenerate_cap");
    }

    if ((await countGenerationsThisHour(service, user.id)) >= STEP6_LIMITS.maxGenerationsPerHour) {
      return costLimitBlocked("hourly_max");
    }

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
      // Best-effort: text already failed; this flip just records it.
      await bestEffortWrite(
        supabase
          .from("pending_generations")
          .update({ text_status: "failed" })
          .eq("generation_id", generationId)
          .eq("user_id", user.id),
        { op: "step6_regenerate_text_status_failed_mark", requestId, userId: user.id, meta: { generationId } },
      );
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

    const { error: textMarkError } = await supabase
      .from("pending_generations")
      .update({ generated_text: textResult.text, text_status: "succeeded" })
      .eq("generation_id", generationId)
      .eq("user_id", user.id);

    if (textMarkError) {
      // Abort before the paid re-render: persisting the new text failed, so
      // attaching audio would spend vendor money on a row whose generated_text
      // never landed (FOLLOW_UPS #61). The regenerate_count was already bumped
      // and committed above — the user keeps their re-roll budget consumed,
      // matching how the text-failure branch leaves state.
      logError({ event: "step6_regenerate_text_mark_failed", requestId, userId: user.id, error: textMarkError, meta: { generationId, regenerateCount: nextCount } });
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

    const audio = await generateAndStoreAudio({
      supabase,
      service,
      userId: user.id,
      generationId,
      voiceId: voice.vendorVoiceId,
      text: textResult.text,
      requestId,
      startMs,
      voiceSettings: getCategoryVoiceSettings(category),
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
