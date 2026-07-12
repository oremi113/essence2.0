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
import { bestEffortWrite } from "@/lib/supabase/checked-write";
import { isActivePending, pendingNotFoundResponse } from "@/lib/messages/route-helpers";
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

      if (!isActivePending(prior)) {
        return pendingNotFoundResponse("Prior generation not found or no longer active");
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

      // === Deferred reshape (Model A — A1 §A1.4) ===========================
      // Under the flag, "Reshape your note" writes the reshaped text as a
      // CANDIDATE on the EXISTING row + bumps edit_note_depth — no new lineage
      // row, no render. The committed take the user heard stays intact as the
      // fallback for "Back to the take you heard". (A1.2's new-row mechanism
      // existed to power the depth cap; edit_note_depth on the same row does
      // that without splitting the candidate across two rows.) The depth cap
      // was already enforced above.
      if (isDeferredAudioEnabled()) {
        const relationship = normalizeRelationship(relationshipRaw);
        const template =
          getTemplateById(effectiveCategory, templateVariant) ??
          selectVariantByIndex(effectiveCategory, relationship, 0);
        const reshaped = await generateMessageText({
          template,
          category: effectiveCategory,
          relationship,
          descriptor: recipient.pending_recipient_descriptor,
          note,
        });
        if (!reshaped.ok) {
          return NextResponse.json(
            {
              generationId: fromGenerationId,
              candidate: false,
              error: "Could not shape your message. Please try again.",
              code: ErrorCode.INTERNAL_ERROR,
              retryable: true,
            },
            { status: 502 },
          );
        }
        const { error: reshapeError } = await supabase
          .from("pending_generations")
          .update({
            note: note || null,
            candidate_text: reshaped.text,
            candidate_template_variant: template.id,
            edit_note_depth: editNoteDepth,
          })
          .eq("generation_id", fromGenerationId)
          .eq("user_id", user.id);

        if (reshapeError) {
          // The reshape text rendered but persisting the candidate failed —
          // don't return candidate:true for a row that never stored it
          // (FOLLOW_UPS #61). Mirror the reshape text-failure branch above.
          logError({ event: "step6_reshape_candidate_write_failed", requestId, userId: user.id, error: reshapeError, meta: { generationId: fromGenerationId, editNoteDepth } });
          return NextResponse.json(
            { generationId: fromGenerationId, candidate: false, error: "Could not shape your message. Please try again.", code: ErrorCode.INTERNAL_ERROR, retryable: true },
            { status: 502 },
          );
        }
        logEvent({
          event: "step6_reshape_candidate",
          requestId,
          userId: user.id,
          outcome: "success",
          durationMs: durationSince(startMs),
          meta: { generationId: fromGenerationId, editNoteDepth },
        });
        return NextResponse.json({
          generationId: fromGenerationId,
          candidate: true,
          candidateText: reshaped.text,
          editNoteDepth,
        });
      }
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
            { error: "Recipient not found", code: ErrorCode.VALIDATION_ERROR, retryable: false },
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
        // Deferred Audio: the first listen is FREE. audio_render_count counts
        // committed re-recordings only (cap 3), so the dots read as 3 commits
        // available at first listen (prototype d1) and the amendment's
        // "3 committed renders" (§5.2). Defaults to 0.
        audio_render_count: 0,
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

    // A failed generation must NOT leave its pending row active. The row is
    // inserted above BEFORE text/audio run; if either fails we return an error,
    // but the row still has saved_message_id + superseded_at both null — exactly
    // what countActivePending counts (cost-controls.ts:102). With the cap at one
    // active flow per user, the orphan makes the A5 "Try again" (a fresh
    // cold-start /generate POST — MessagesNewPageClient.tsx:77) 429 pending_max
    // FOREVER, and blocks every future message (FOLLOW_UPS #93). Supersede the
    // row on any failure so the slot frees immediately and the retry succeeds.
    // Best-effort: a failed supersede is no worse than today, never blocks the
    // error response. The saved_message_id guard mirrors the success-path
    // supersede below — never touch a row that somehow already saved.
    const discardFailedPending = () =>
      bestEffortWrite(
        supabase
          .from("pending_generations")
          .update({ superseded_at: new Date().toISOString() })
          .eq("generation_id", generationId)
          .eq("user_id", user.id)
          .is("saved_message_id", null),
        { op: "step6_discard_failed_pending", requestId, userId: user.id, meta: { generationId } },
      );

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
      // Best-effort: text already failed; this flip just records it.
      await bestEffortWrite(
        supabase
          .from("pending_generations")
          .update({ text_status: "failed" })
          .eq("generation_id", generationId)
          .eq("user_id", user.id),
        { op: "step6_text_status_failed_mark", requestId, userId: user.id, meta: { generationId } },
      );
      await discardFailedPending(); // FOLLOW_UPS #93 — free the active-pending slot
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

    const { error: textMarkError } = await supabase
      .from("pending_generations")
      .update({ generated_text: textResult.text, text_status: "succeeded" })
      .eq("generation_id", generationId)
      .eq("user_id", user.id);

    if (textMarkError) {
      // The text rendered, but persisting it failed. Abort BEFORE the paid
      // ElevenLabs render — proceeding would spend vendor money to attach audio
      // to a row whose generated_text never landed, then /save would read empty
      // text (FOLLOW_UPS #61). Surface the same failed/retryable shape the
      // text-failure branch above uses; audio never ran, so audioStatus stays
      // "pending".
      logError({ event: "step6_text_mark_failed", requestId, userId: user.id, error: textMarkError, meta: { generationId } });
      await discardFailedPending(); // FOLLOW_UPS #93 — free the active-pending slot
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
      await discardFailedPending(); // FOLLOW_UPS #93 — free the active-pending slot
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
      // Best-effort bookkeeping: a failed supersede leaves the prior row active
      // (minor lineage redundancy), never blocks the succeeded new generation.
      await bestEffortWrite(
        supabase
          .from("pending_generations")
          .update({ superseded_at: new Date().toISOString() })
          .eq("generation_id", priorGenerationId)
          .eq("user_id", user.id)
          .is("saved_message_id", null),
        { op: "step6_supersede_prior", requestId, userId: user.id, meta: { priorGenerationId } },
      );
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
