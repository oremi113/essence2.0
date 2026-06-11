/**
 * POST /api/messages/generate — start a fresh Step 6 generation.
 *
 * Runs the hybrid LLM (text) then ElevenLabs (audio) synchronously and writes
 * the result into a `pending_generations` row — NOT a `messages` row. The
 * message stays ephemeral until /save. See docs/API_CONTRACTS.md and
 * docs/session-8/Step6_OpenContracts.md Q1–Q4.
 *
 * Two entry shapes:
 *  - Cold start: a recipient branch (existing recipientId OR a typed pending
 *    recipient) + category + optional note.
 *  - Edit-note ("Reshape your note"): `fromGenerationId` present. Mints a NEW
 *    generation in the same lineage, reuses the prior variant + recipient, and
 *    supersedes the prior row only after this one fully succeeds (Q3).
 */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { ErrorCode } from "@/lib/errors";
import { logEvent, logError, durationSince } from "@/lib/logger";
import { assertCanGenerateMessage } from "@/lib/guards";
import { recordUsageEvent } from "@/lib/rate-limit";
import { defineRoute } from "@/lib/api/defineRoute";
import { messageGenerateSchema } from "@/lib/api/schemas";
import { normalizeRelationship, getCategoryVoiceSettings, type MessageCategory } from "@/lib/messageTemplates";
import { selectVariantByIndex, getTemplateById, generateMessageText } from "@/lib/messages/generation";
import { generateAndStoreAudio } from "@/lib/messages/audio";
import {
  STEP6_LIMITS,
  STEP6_GENERATE_ACTION,
  costLimitBlocked,
  countActivePending,
  countGenerationsThisHour,
  isDeferredAudioEnabled,
} from "@/lib/messages/cost-controls";

export const maxDuration = 120; // 2 min — LLM insert + TTS + upload

export const POST = defineRoute(
  {
    auth: true,
    checkBodySize: true,
    bodySchema: messageGenerateSchema,
    dedup: { action: "step6_generate", event: "step6_generate_dedup" },
  },
  async ({ body, user, requestId }) => {
    const startMs = Date.now();
    const supabase = await createSupabaseServerClient();
    const service = createSupabaseServiceClient();

    const {
      voiceProfileId,
      category,
      note,
      recipientId,
      pendingRecipientName,
      pendingRecipientRelationship,
      pendingRecipientDescriptor,
      fromGenerationId,
    } = body;

    // --- Ownership + ready + vendor_voice_id (and a daily backstop) ---
    const profile = await assertCanGenerateMessage(supabase, service, user.id, voiceProfileId);

    // --- Resolve recipient + lineage ---------------------------------------
    // Edit-note carries recipient/variant/category from the prior row so the
    // lineage stays consistent; cold start takes them from the request.
    let effectiveCategory: MessageCategory = category;
    let relationshipRaw: string | null = pendingRecipientRelationship ?? null;
    let recipient: {
      recipient_id: string | null;
      pending_recipient_name: string | null;
      pending_recipient_relationship: string | null;
      pending_recipient_descriptor: string | null;
    };
    let editNoteDepth = 0;
    let templateVariant: string;
    let priorGenerationId: string | null = null;

    if (fromGenerationId) {
      // --- Edit-note path (Q3) ---
      const { data: prior } = await supabase
        .from("pending_generations")
        .select(
          "generation_id, category, template_variant, edit_note_depth, recipient_id, pending_recipient_name, pending_recipient_relationship, pending_recipient_descriptor, saved_message_id, superseded_at",
        )
        .eq("generation_id", fromGenerationId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!prior || prior.saved_message_id || prior.superseded_at) {
        return NextResponse.json(
          { error: "Prior generation not found or no longer active", code: ErrorCode.VALIDATION_ERROR },
          { status: 404 },
        );
      }

      editNoteDepth = prior.edit_note_depth + 1;
      if (editNoteDepth > STEP6_LIMITS.maxEditNoteDepth) {
        return costLimitBlocked("edit_note_depth");
      }

      effectiveCategory = prior.category as MessageCategory;
      templateVariant = prior.template_variant;
      relationshipRaw = prior.pending_recipient_relationship;
      recipient = {
        recipient_id: prior.recipient_id,
        pending_recipient_name: prior.pending_recipient_name,
        pending_recipient_relationship: prior.pending_recipient_relationship,
        pending_recipient_descriptor: prior.pending_recipient_descriptor,
      };
      priorGenerationId = prior.generation_id;
    } else {
      // --- Cold-start path ---
      // One active in-flight flow per user.
      if ((await countActivePending(supabase, user.id)) >= STEP6_LIMITS.maxActivePendingPerUser) {
        return costLimitBlocked("pending_max");
      }

      if (recipientId) {
        const { data: rec } = await supabase
          .from("recipients")
          .select("id, relationship")
          .eq("id", recipientId)
          .eq("user_id", user.id)
          .maybeSingle();
        if (!rec) {
          return NextResponse.json(
            { error: "Recipient not found", code: ErrorCode.VALIDATION_ERROR },
            { status: 404 },
          );
        }
        relationshipRaw = rec.relationship;
        recipient = {
          recipient_id: rec.id,
          pending_recipient_name: null,
          pending_recipient_relationship: null,
          pending_recipient_descriptor: null,
        };
      } else {
        recipient = {
          recipient_id: null,
          pending_recipient_name: pendingRecipientName ?? null,
          pending_recipient_relationship: pendingRecipientRelationship ?? null,
          pending_recipient_descriptor: pendingRecipientDescriptor ?? null,
        };
      }

      templateVariant = selectVariantByIndex(category, normalizeRelationship(relationshipRaw), 0).id;
    }

    const relationship = normalizeRelationship(relationshipRaw);

    // --- Hourly generation cap (Q4) ---
    if ((await countGenerationsThisHour(service, user.id)) >= STEP6_LIMITS.maxGenerationsPerHour) {
      return costLimitBlocked("hourly_max");
    }

    // Ledger entry — drives the hourly cap counting.
    await recordUsageEvent(service, {
      userId: user.id,
      action: STEP6_GENERATE_ACTION,
      requestId,
      outcome: "started",
      meta: { category: effectiveCategory, isEditNote: !!fromGenerationId, hasNote: !!note },
    });

    // --- Create the pending row (status = pending/pending) ------------------
    const { data: created, error: insertError } = await supabase
      .from("pending_generations")
      .insert({
        user_id: user.id,
        voice_profile_id: voiceProfileId,
        recipient_id: recipient.recipient_id,
        pending_recipient_name: recipient.pending_recipient_name,
        pending_recipient_relationship: recipient.pending_recipient_relationship,
        pending_recipient_descriptor: recipient.pending_recipient_descriptor,
        category: effectiveCategory,
        note: note || null,
        template_variant: templateVariant,
        text_status: "pending",
        audio_status: "pending",
        regenerate_count: 0,
        // Deferred Audio: the first listen consumes one render allowance.
        audio_render_count: isDeferredAudioEnabled() ? 1 : 0,
        edit_note_depth: editNoteDepth,
        source_generation_id: priorGenerationId,
      })
      .select("generation_id")
      .single();

    if (insertError || !created) {
      logError({ event: "step6_pending_insert_failed", requestId, userId: user.id, error: insertError });
      return NextResponse.json(
        { error: "Could not start generation", code: ErrorCode.INTERNAL_ERROR, retryable: true },
        { status: 500 },
      );
    }

    const generationId = created.generation_id;

    // --- Resolve the template (edit-note reuses prior variant) --------------
    const template =
      getTemplateById(effectiveCategory, templateVariant) ??
      selectVariantByIndex(effectiveCategory, relationship, 0);

    // --- Text generation (hybrid LLM) --------------------------------------
    const textResult = await generateMessageText({
      template,
      category: effectiveCategory,
      relationship,
      descriptor: recipient.pending_recipient_descriptor,
      note,
    });

    if (!textResult.ok) {
      await supabase
        .from("pending_generations")
        .update({ text_status: "failed" })
        .eq("generation_id", generationId)
        .eq("user_id", user.id);
      logEvent({
        event: "step6_text_failed",
        requestId,
        userId: user.id,
        outcome: "error",
        meta: { generationId, code: textResult.code, durationMs: durationSince(startMs) },
      });
      return NextResponse.json(
        {
          generationId,
          textStatus: "failed",
          audioStatus: "pending",
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

    // --- Audio generation (ElevenLabs) -------------------------------------
    const audioOutcome = await generateAndStoreAudio({
      supabase,
      service,
      userId: user.id,
      generationId,
      voiceId: profile.vendor_voice_id,
      text: textResult.text,
      requestId,
      startMs,
      voiceSettings: getCategoryVoiceSettings(effectiveCategory),
    });

    if (!audioOutcome.ok) {
      return NextResponse.json(
        {
          generationId,
          textStatus: "succeeded",
          audioStatus: "failed",
          error: "Could not generate audio. Please try again.",
          code: audioOutcome.code,
          retryable: true,
        },
        { status: 502 },
      );
    }

    // --- Success: supersede the prior lineage member (edit-note only, Q3) ---
    if (priorGenerationId) {
      await supabase
        .from("pending_generations")
        .update({ superseded_at: new Date().toISOString() })
        .eq("generation_id", priorGenerationId)
        .eq("user_id", user.id)
        .is("saved_message_id", null);
    }

    logEvent({
      event: "step6_generate_complete",
      requestId,
      userId: user.id,
      outcome: "success",
      durationMs: durationSince(startMs),
      meta: { generationId, category: effectiveCategory, editNoteDepth, isEditNote: !!fromGenerationId },
    });

    return NextResponse.json({
      generationId,
      textStatus: "succeeded",
      audioStatus: "succeeded",
    });
  },
);
