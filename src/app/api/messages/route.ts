/**
 * GET  /api/messages — List messages for the authed user (Memory Shelf).
 * POST /api/messages — Create a message using a preserved voice.
 *
 * Phase 8: guards, idempotency (advisory lock), monotonic transitions, structured logging.
 */
import { createHash } from "crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { generateSpeech } from "@/lib/elevenlabs";
import { AUDIO_BUCKET, messageAudioObjectPath } from "@/lib/audio/storage-paths";
import { NextResponse } from "next/server";
import { ErrorCode } from "@/lib/errors";
import { logEvent, logError, hashPrompt, durationSince } from "@/lib/logger";
import { assertCanGenerateMessage } from "@/lib/guards";
import { recordUsageEvent, updateUsageEventOutcome } from "@/lib/rate-limit";
import { defineRoute } from "@/lib/api/defineRoute";
import { messageCreateSchema } from "@/lib/api/schemas";
import { sanitizeErrorMessage } from "@/lib/api/sanitize";

export const maxDuration = 120; // 2 min — TTS + upload

const LIST_LIMIT = 50;

// ---------------------------------------------------------------------------
// GET — List messages (Memory Shelf)
// ---------------------------------------------------------------------------

/**
 * Supabase relation joins return either an object or an array depending on
 * the FK shape, and TS can't always infer them. This helper handles both
 * shapes so the GET handler doesn't need an `as unknown as` cast.
 */
function extractRecipientName(rel: unknown): string | null {
  if (!rel || typeof rel !== "object") return null;
  const obj = Array.isArray(rel) ? rel[0] : rel;
  if (!obj || typeof obj !== "object") return null;
  const name = (obj as Record<string, unknown>).name;
  return typeof name === "string" ? name : null;
}

export const GET = defineRoute(
  { auth: true },
  async ({ user, requestId }) => {
    const supabase = await createSupabaseServerClient();

    // Memory Shelf only displays saved messages; filter at the DB
    // level so we don't ship failed/pending rows the client throws
    // away. If a future caller needs other statuses, add a `?status=`
    // query param rather than broadening the default.
    const { data: messages, error } = await supabase
      .from("messages")
      .select(
        "id, status, title, body_text, created_at, recipient_id, recipients(name)"
      )
      .eq("user_id", user.id)
      .eq("status", "saved")
      .order("created_at", { ascending: false })
      .limit(LIST_LIMIT);

    if (error) {
      logError({ event: "messages_list_error", requestId, userId: user.id, error });
      return NextResponse.json(
        { error: "Could not load messages" },
        { status: 500 }
      );
    }

    const items = (messages ?? []).map((m) => ({
      id: m.id,
      status: m.status,
      title: m.title,
      bodyExcerpt: m.body_text
        ? m.body_text.length > 80
          ? m.body_text.slice(0, 80) + "…"
          : m.body_text
        : null,
      recipientName: extractRecipientName(m.recipients),
      createdAt: m.created_at,
    }));

    return NextResponse.json({ messages: items });
  }
);

// ---------------------------------------------------------------------------
// POST — Create message (Phase 6 + Phase 8 hardening)
// ---------------------------------------------------------------------------

export const POST = defineRoute(
  {
    auth: true,
    checkBodySize: true,
    bodySchema: messageCreateSchema,
    dedup: { action: "message_generate", event: "message_generate_dedup" },
  },
  async ({ body, user, requestId }) => {
    const startMs = Date.now();
    const supabase = await createSupabaseServerClient();

    const { voiceProfileId, promptText, title, recipientId } = body;

    // --- Centralized guard: ownership + ready + vendor_voice_id + daily cap ---
    const service = createSupabaseServiceClient();
    const profile = await assertCanGenerateMessage(supabase, service, user.id, voiceProfileId);

    // --- Record usage event (started) ---
    const promptHash = hashPrompt(promptText);
    await recordUsageEvent(service, {
      userId: user.id,
      action: "message_generate",
      requestId,
      outcome: "started",
      meta: { voiceProfileId, promptLength: promptText.trim().length, promptHash },
    });

    // --- Idempotency: compute key, acquire advisory lock, check for existing ---
    const idempotencyKey = createHash("sha256")
      .update(`${user.id}:${voiceProfileId}:${recipientId ?? ""}:${promptText.trim()}`)
      .digest("hex");

    // Advisory lock prevents double-generate races
    const lockKey = BigInt("0x" + idempotencyKey.slice(0, 15));
    // Convert to signed 64-bit range for Postgres bigint
    const lockKeyNum = Number(lockKey % BigInt(2 ** 53));
    await service.rpc("acquire_advisory_lock", { lock_key: lockKeyNum });

    // Check for existing non-failed message with same idempotency key
    const { data: existing } = await supabase
      .from("messages")
      .select("id, status")
      .eq("idempotency_key", idempotencyKey)
      .neq("status", "failed")
      .limit(1)
      .maybeSingle();

    if (existing) {
      logEvent({
        event: "message_generate_idempotent",
        requestId,
        userId: user.id,
        messageId: existing.id,
        outcome: "success",
        meta: { existingStatus: existing.status },
      });
      await updateUsageEventOutcome(service, requestId, "idempotent_hit");
      return NextResponse.json({ messageId: existing.id, status: existing.status, idempotent: true });
    }

    logEvent({
      event: "message_generate_start",
      requestId,
      userId: user.id,
      voiceProfileId,
      outcome: "success",
      meta: { promptLength: promptText.trim().length, promptHash },
    });

    // --- Create message row (status = generating) ---
    const now = new Date().toISOString();
    const { data: message, error: insertError } = await supabase
      .from("messages")
      .insert({
        user_id: user.id,
        voice_profile_id: voiceProfileId,
        recipient_id: recipientId || null,
        title: title?.trim() || null,
        body_text: promptText.trim(),
        status: "generating",
        storage_bucket: AUDIO_BUCKET,
        generation_started_at: now,
        idempotency_key: idempotencyKey,
      })
      .select("id")
      .single();

    if (insertError || !message) {
      logError({ event: "message_insert_failed", requestId, userId: user.id, error: insertError });
      await updateUsageEventOutcome(service, requestId, "error");
      return NextResponse.json(
        { error: "Could not create message", code: ErrorCode.INTERNAL_ERROR, retryable: true },
        { status: 500 }
      );
    }

    const messageId = message.id;

    // --- Generate speech via ElevenLabs ---
    // NEVER auto-retry within the same request. If this fails, mark failed and return.
    const ttsResult = await generateSpeech({
      voiceId: profile.vendor_voice_id,
      text: promptText.trim(),
    });

    if (!ttsResult.ok) {
      const errorCode = ttsResult.status === 504 ? ErrorCode.TTS_TIMEOUT : ErrorCode.TTS_FAILED;
      logEvent({
        event: "message_tts_failed",
        requestId,
        userId: user.id,
        messageId,
        outcome: "error",
        errorCode,
        durationMs: durationSince(startMs),
        meta: { ttsStatus: ttsResult.status },
      });

      // Monotonic transition: only update if still in "generating"
      await supabase
        .from("messages")
        .update({
          status: "failed",
          last_error_code: ttsResult.code ?? String(ttsResult.status),
          last_error_message: sanitizeErrorMessage(ttsResult.message, 500),
        })
        .eq("id", messageId)
        .eq("user_id", user.id)
        .eq("status", "generating"); // monotonic guard

      await updateUsageEventOutcome(service, requestId, "error", durationSince(startMs));
      return NextResponse.json(
        {
          messageId,
          status: "failed",
          error: "Could not generate audio. Please try again.",
          code: errorCode,
          retryable: true,
        },
        { status: 502 }
      );
    }

    // --- Monotonic transition: generating → saving ---
    const { data: savingUpdate } = await supabase
      .from("messages")
      .update({ status: "saving" })
      .eq("id", messageId)
      .eq("user_id", user.id)
      .eq("status", "generating") // monotonic guard
      .select("id")
      .maybeSingle();

    if (!savingUpdate) {
      // Another request already transitioned this message — abort
      logEvent({
        event: "message_stale_transition",
        requestId,
        userId: user.id,
        messageId,
        outcome: "rejected",
        meta: { transition: "generating->saving" },
      });
      await updateUsageEventOutcome(service, requestId, "stale");
      return NextResponse.json({ messageId, status: "generating", error: "State conflict." }, { status: 409 });
    }

    // --- Upload audio to Supabase Storage ---
    const objectPath = messageAudioObjectPath(user.id, voiceProfileId, messageId);

    const { error: uploadError } = await service.storage
      .from(AUDIO_BUCKET)
      .upload(objectPath, ttsResult.audioBuffer, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (uploadError) {
      logEvent({
        event: "message_upload_failed",
        requestId,
        userId: user.id,
        messageId,
        outcome: "error",
        errorCode: ErrorCode.STORAGE_FAILED,
        durationMs: durationSince(startMs),
      });

      // Monotonic: only update if still "saving"
      await supabase
        .from("messages")
        .update({
          status: "failed",
          last_error_code: "STORAGE_UPLOAD_FAILED",
          last_error_message: sanitizeErrorMessage(uploadError.message, 500),
        })
        .eq("id", messageId)
        .eq("user_id", user.id)
        .eq("status", "saving"); // monotonic guard

      await updateUsageEventOutcome(service, requestId, "error", durationSince(startMs));
      return NextResponse.json(
        {
          messageId,
          status: "failed",
          error: "Could not save audio. Please try again.",
          code: ErrorCode.STORAGE_FAILED,
          retryable: true,
        },
        { status: 502 }
      );
    }

    // --- Monotonic transition: saving → saved ---
    const completedAt = new Date().toISOString();
    const { data: finalUpdate } = await supabase
      .from("messages")
      .update({
        status: "saved",
        storage_path: objectPath,
        audio_bytes: ttsResult.audioBuffer.length,
        generation_completed_at: completedAt,
      })
      .eq("id", messageId)
      .eq("user_id", user.id)
      .eq("status", "saving") // monotonic guard
      .select("id")
      .maybeSingle();

    if (!finalUpdate) {
      logEvent({
        event: "message_stale_transition",
        requestId,
        userId: user.id,
        messageId,
        outcome: "rejected",
        meta: { transition: "saving->saved" },
      });
      await updateUsageEventOutcome(service, requestId, "stale");
      return NextResponse.json(
        { messageId, status: "saving", error: "Message created but finalization failed." },
        { status: 500 }
      );
    }

    const totalDurationMs = durationSince(startMs);
    logEvent({
      event: "message_generate_complete",
      requestId,
      userId: user.id,
      messageId,
      voiceProfileId,
      outcome: "success",
      durationMs: totalDurationMs,
      meta: { audioBytes: ttsResult.audioBuffer.length, promptLength: promptText.trim().length, promptHash },
    });
    await updateUsageEventOutcome(service, requestId, "success", totalDurationMs);

    return NextResponse.json({ messageId, status: "saved" });
  }
);
