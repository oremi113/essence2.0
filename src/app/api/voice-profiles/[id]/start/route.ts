/**
 * POST: Start voice creation (ElevenLabs). Idempotent; enforces min clips and retry backoff.
 * Long-running: downloads clips then calls ElevenLabs (can take 1–2 min).
 *
 * Phase 8: centralized guard for daily cap, structured logging, no auto-retry.
 * NEVER retry ElevenLabs within the same request. Mark failed and return.
 */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { createVoiceFromClips } from "@/lib/elevenlabs";
import { NextResponse } from "next/server";
import { logEvent, logError, durationSince } from "@/lib/logger";
import { assertCanStartVoiceCreation } from "@/lib/guards";
import { recordUsageEvent, updateUsageEventOutcome } from "@/lib/rate-limit";
import {
  VOICE_PROFILE_MAX_ATTEMPTS,
  isVoiceProfileRetryAllowed,
} from "@/lib/voice-training/backoff";
import { markVoiceProfileFailed } from "@/lib/voice-creation/mark-failed";
import {
  MIN_CLIP_COUNT,
  MIN_TOTAL_BYTES,
  downloadClipsForVoiceProfile,
} from "@/lib/voice-creation/download-clips";
import { defineRoute } from "@/lib/api/defineRoute";
import { sanitizeErrorMessage } from "@/lib/api/sanitize";

export const maxDuration = 300; // 5 min (allow ElevenLabs + download time)

/** If still "processing" after this, treat as timed out so user can retry. */
const STALE_PROCESSING_MS = 3 * 60 * 1000; // 3 min

export const POST = defineRoute<true, { id: string }>(
  {
    auth: true,
    dedup: {
      action: "voice_create",
      event: "voice_create_dedup",
      meta: ({ params }) => ({ voiceProfileId: params.id }),
    },
  },
  async ({ user, requestId, params }) => {
    const startMs = Date.now();
    const voiceProfileId = params.id;
    const supabase = await createSupabaseServerClient();

    // --- Centralized guard: daily voice creation cap ---
    const service = createSupabaseServiceClient();
    await assertCanStartVoiceCreation(service, user.id);

    const { data: profile, error: fetchError } = await supabase
      .from("voice_profiles")
      .select("id, user_id, status, label, attempt_count, last_attempt_at")
      .eq("id", voiceProfileId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !profile) {
      return NextResponse.json({ error: "Voice profile not found" }, { status: 404 });
    }

    logEvent({
      event: "voice_create_start",
      requestId,
      userId: user.id,
      voiceProfileId,
      outcome: "success",
      meta: { currentStatus: profile.status, attemptCount: profile.attempt_count },
    });

    // Idempotent: already ready
    if (profile.status === "ready") {
      return NextResponse.json({ status: "ready", next: "continue" });
    }

    // Stuck "processing" (request timed out or crashed): allow recovery
    if (profile.status === "processing") {
      const lastAttempt = profile.last_attempt_at ? new Date(profile.last_attempt_at).getTime() : 0;
      const elapsed = lastAttempt ? Date.now() - lastAttempt : STALE_PROCESSING_MS + 1;
      if (elapsed > STALE_PROCESSING_MS) {
        await markVoiceProfileFailed(
          supabase,
          voiceProfileId,
          user.id,
          "TIMEOUT",
          "Previous attempt timed out."
        );
        return NextResponse.json({
          status: "failed",
          error: "Previous attempt timed out. You can try again.",
          retry_available: true,
        });
      }
    }

    // No duplicate start while in progress (and not stale)
    if (profile.status === "queued" || profile.status === "processing") {
      return NextResponse.json({ status: profile.status });
    }

    // Failed: enforce backoff and max attempts
    if (profile.status === "failed") {
      if (!isVoiceProfileRetryAllowed(profile.attempt_count ?? 0, profile.last_attempt_at)) {
        return NextResponse.json(
          { error: "Retry not available yet", retry_available: false, status: "failed" },
          { status: 429 }
        );
      }
    }

    // Only collecting, created (legacy), or failed (retry allowed) from here
    const canStart =
      profile.status === "collecting" ||
      profile.status === "created" ||
      profile.status === "failed";
    if (!canStart) {
      return NextResponse.json({ status: profile.status });
    }

    // Record usage event
    await recordUsageEvent(service, {
      userId: user.id,
      action: "voice_create",
      requestId,
      outcome: "started",
      meta: { voiceProfileId, attemptCount: (profile.attempt_count ?? 0) + 1 },
    });

    // DB trigger allows created -> collecting and failed -> collecting.
    if (profile.status === "created" || profile.status === "failed") {
      const { error: collectError } = await supabase
        .from("voice_profiles")
        .update({ status: "collecting" })
        .eq("id", voiceProfileId)
        .eq("user_id", user.id)
        .eq("status", profile.status); // monotonic guard
      if (collectError) {
        logError({ event: "voice_create_collect_failed", requestId, userId: user.id, voiceProfileId, error: collectError });
        await updateUsageEventOutcome(service, requestId, "error");
        return NextResponse.json(
          { error: "Could not start voice creation.", detail: collectError.message, code: "LOCK_FAILED" },
          { status: 500 }
        );
      }
    }

    // Minimum clip validation
    const { data: clipRows, count: clipCount } = await supabase
      .from("training_clips")
      .select("id, bytes", { count: "exact" })
      .eq("voice_profile_id", voiceProfileId)
      .eq("status", "uploaded");

    if ((clipCount ?? 0) < MIN_CLIP_COUNT) {
      await updateUsageEventOutcome(service, requestId, "rejected");
      return NextResponse.json(
        { error: "Not enough clips", code: "INSUFFICIENT_CLIPS", required: MIN_CLIP_COUNT, actual: clipCount ?? 0 },
        { status: 400 }
      );
    }

    const totalBytesFromDb = clipRows?.reduce((sum, r) => sum + (r.bytes ?? 0), 0) ?? 0;
    if (totalBytesFromDb < MIN_TOTAL_BYTES) {
      await updateUsageEventOutcome(service, requestId, "rejected");
      return NextResponse.json(
        {
          error: "Clips are too short. Record at least about 1 minute of audio in total (longer clips work better).",
          code: "CLIPS_TOO_SHORT",
          required_bytes: MIN_TOTAL_BYTES,
          actual_bytes: totalBytesFromDb,
        },
        { status: 400 }
      );
    }

    // Lock: transition to processing
    const { data: updated, error: updateError } = await supabase
      .from("voice_profiles")
      .update({
        status: "processing",
        attempt_count: (profile.attempt_count ?? 0) + 1,
        last_attempt_at: new Date().toISOString(),
        source_clip_count: clipCount ?? 0,
      })
      .eq("id", voiceProfileId)
      .eq("user_id", user.id)
      .in("status", ["collecting", "created", "failed"])
      .select("id")
      .single();

    if (updateError || !updated) {
      const dbMessage = updateError?.message ?? "no rows updated";
      logError({ event: "voice_create_lock_failed", requestId, userId: user.id, voiceProfileId, error: updateError });
      const { data: current } = await supabase
        .from("voice_profiles")
        .select("status")
        .eq("id", voiceProfileId)
        .single();
      const status = current?.status ?? "collecting";
      if (status === "created" || status === "collecting") {
        await updateUsageEventOutcome(service, requestId, "error");
        return NextResponse.json(
          {
            error: "Could not start voice creation. Ensure database migrations are applied.",
            code: "LOCK_FAILED",
            status,
            detail: String(dbMessage).slice(0, 200),
          },
          { status: 500 }
        );
      }
      return NextResponse.json({ status });
    }

    logEvent({
      event: "voice_create_processing",
      requestId,
      userId: user.id,
      voiceProfileId,
      outcome: "success",
      meta: { clipCount: clipCount ?? 0, totalBytes: totalBytesFromDb },
    });

    // Download clips from storage and validate against the
    // minimum-clip / minimum-bytes thresholds. The helper handles
    // the loop + per-clip download error logging via callback;
    // we map its discriminated result back into NextResponses here.
    const downloadResult = await downloadClipsForVoiceProfile(
      supabase,
      service,
      voiceProfileId,
      (clipId, dlError) => {
        logError({
          event: "voice_create_clip_download_failed",
          requestId,
          userId: user.id,
          voiceProfileId,
          error: dlError,
          meta: { clipId },
        });
      }
    );

    if (downloadResult.kind === "no-clips") {
      await markVoiceProfileFailed(supabase, voiceProfileId, user.id, "NO_CLIPS", "No valid clips found");
      await updateUsageEventOutcome(service, requestId, "error");
      return NextResponse.json({ status: "failed", error: "No valid clips found" }, { status: 500 });
    }

    if (downloadResult.kind === "download-failed") {
      await markVoiceProfileFailed(
        supabase,
        voiceProfileId,
        user.id,
        "DOWNLOAD_FAILED",
        "Could not load enough clips from storage"
      );
      await updateUsageEventOutcome(service, requestId, "error");
      return NextResponse.json({ status: "failed", error: "Could not load enough clips" }, { status: 500 });
    }

    if (downloadResult.kind === "too-short") {
      await markVoiceProfileFailed(
        supabase,
        voiceProfileId,
        user.id,
        "CLIPS_TOO_SHORT",
        `Total audio too short (${Math.round(downloadResult.totalBytes / 1024)} KB).`
      );
      await updateUsageEventOutcome(service, requestId, "error");
      return NextResponse.json(
        {
          status: "failed",
          error: "Clips are too short. Record at least about 1 minute of audio in total.",
          code: "CLIPS_TOO_SHORT",
        },
        { status: 400 }
      );
    }

    const { blobs: audioBlobs, totalBytes } = downloadResult;

    // --- Call ElevenLabs ---
    // NEVER retry within the same request. If this times out or fails, mark failed and return.
    logEvent({
      event: "voice_create_elevenlabs_call",
      requestId,
      userId: user.id,
      voiceProfileId,
      outcome: "success",
      meta: { blobCount: audioBlobs.length, totalBytes },
    });

    const result = await createVoiceFromClips({
      name: profile.label || "My voice",
      audioBlobs,
    });

    if (result.ok) {
      const now = new Date().toISOString();
      // Monotonic: only update if still "processing"
      await supabase
        .from("voice_profiles")
        .update({
          status: "ready",
          vendor_voice_id: result.voice_id,
          processing_completed_at: now,
          ready_at: now,
          last_error_code: null,
          last_error_message: null,
          last_error_at: null,
        })
        .eq("id", voiceProfileId)
        .eq("user_id", user.id)
        .eq("status", "processing"); // monotonic guard

      const totalDurationMs = durationSince(startMs);
      logEvent({
        event: "voice_create_complete",
        requestId,
        userId: user.id,
        voiceProfileId,
        outcome: "success",
        durationMs: totalDurationMs,
      });
      await updateUsageEventOutcome(service, requestId, "success", totalDurationMs);

      return NextResponse.json({ status: "ready", next: "continue" });
    }

    // ElevenLabs failed
    const isTimeout = result.status === 504;
    const safeMessage = sanitizeErrorMessage(result.message, 500);
    logEvent({
      event: "voice_create_elevenlabs_failed",
      requestId,
      userId: user.id,
      voiceProfileId,
      outcome: "error",
      errorCode: isTimeout ? "TTS_TIMEOUT" : "TTS_FAILED",
      durationMs: durationSince(startMs),
      meta: { ttsStatus: result.status },
    });

    await markVoiceProfileFailed(
      supabase,
      voiceProfileId,
      user.id,
      result.code ?? String(result.status),
      safeMessage
    );

    await updateUsageEventOutcome(service, requestId, "error", durationSince(startMs));
    const retryAllowed = (profile.attempt_count ?? 0) + 1 < VOICE_PROFILE_MAX_ATTEMPTS;
    return NextResponse.json(
      { status: "failed", error: safeMessage, retry_available: retryAllowed },
      { status: result.status >= 500 ? 502 : 400 }
    );
  }
);
