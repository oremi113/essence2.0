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
import { handleRouteError } from "@/lib/errors";
import { logEvent, logError, generateRequestId, durationSince, withRequestId } from "@/lib/logger";
import { assertCanStartVoiceCreation } from "@/lib/guards";
import { isDedupBlocked, recordUsageEvent, updateUsageEventOutcome } from "@/lib/rate-limit";
import {
  VOICE_PROFILE_MAX_ATTEMPTS,
  isVoiceProfileRetryAllowed,
} from "@/lib/voice-training/backoff";

export const maxDuration = 300; // 5 min (allow ElevenLabs + download time)

const MIN_CLIP_COUNT = 10;
/** Minimum total audio size (~1 min at low bitrate). */
const MIN_TOTAL_BYTES = 100 * 1024; // 100 KB
/** If still "processing" after this, treat as timed out so user can retry. */
const STALE_PROCESSING_MS = 3 * 60 * 1000; // 3 min

function sanitizeErrorMessage(msg: string, maxLen = 500): string {
  const s = String(msg).replace(/\s+/g, " ").trim();
  return s.length > maxLen ? s.slice(0, maxLen) + "…" : s;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  const startMs = Date.now();

  try {
    const { id: voiceProfileId } = await params;
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return withRequestId(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        requestId
      );
    }

    // --- In-memory dedup (UX polish only) ---
    if (isDedupBlocked(user.id, "voice_create")) {
      logEvent({
        event: "voice_create_dedup",
        requestId,
        userId: user.id,
        voiceProfileId,
        outcome: "rejected",
      });
      return withRequestId(
        NextResponse.json(
          { error: "Request already in progress. Please wait.", code: "RATE_LIMIT_EXCEEDED", retryable: true },
          { status: 429 }
        ),
        requestId
      );
    }

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
      return withRequestId(
        NextResponse.json({ error: "Voice profile not found" }, { status: 404 }),
        requestId
      );
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
      return withRequestId(
        NextResponse.json({ status: "ready", next: "continue" }),
        requestId
      );
    }

    // Stuck "processing" (request timed out or crashed): allow recovery
    if (profile.status === "processing") {
      const lastAttempt = profile.last_attempt_at ? new Date(profile.last_attempt_at).getTime() : 0;
      const elapsed = lastAttempt ? Date.now() - lastAttempt : STALE_PROCESSING_MS + 1;
      if (elapsed > STALE_PROCESSING_MS) {
        await supabase
          .from("voice_profiles")
          .update({
            status: "failed",
            last_error_code: "TIMEOUT",
            last_error_message: "Previous attempt timed out.",
            last_error_at: new Date().toISOString(),
          })
          .eq("id", voiceProfileId)
          .eq("user_id", user.id)
          .eq("status", "processing"); // monotonic guard
        return withRequestId(
          NextResponse.json({
            status: "failed",
            error: "Previous attempt timed out. You can try again.",
            retry_available: true,
          }),
          requestId
        );
      }
    }

    // No duplicate start while in progress (and not stale)
    if (profile.status === "queued" || profile.status === "processing") {
      return withRequestId(
        NextResponse.json({ status: profile.status }),
        requestId
      );
    }

    // Failed: enforce backoff and max attempts
    if (profile.status === "failed") {
      if (!isVoiceProfileRetryAllowed(profile.attempt_count ?? 0, profile.last_attempt_at)) {
        return withRequestId(
          NextResponse.json(
            { error: "Retry not available yet", retry_available: false, status: "failed" },
            { status: 429 }
          ),
          requestId
        );
      }
    }

    // Only collecting, created (legacy), or failed (retry allowed) from here
    const canStart =
      profile.status === "collecting" ||
      profile.status === "created" ||
      profile.status === "failed";
    if (!canStart) {
      return withRequestId(
        NextResponse.json({ status: profile.status }),
        requestId
      );
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
        return withRequestId(
          NextResponse.json(
            { error: "Could not start voice creation.", detail: collectError.message, code: "LOCK_FAILED" },
            { status: 500 }
          ),
          requestId
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
      return withRequestId(
        NextResponse.json(
          { error: "Not enough clips", code: "INSUFFICIENT_CLIPS", required: MIN_CLIP_COUNT, actual: clipCount ?? 0 },
          { status: 400 }
        ),
        requestId
      );
    }

    const totalBytesFromDb = clipRows?.reduce((sum, r) => sum + (r.bytes ?? 0), 0) ?? 0;
    if (totalBytesFromDb < MIN_TOTAL_BYTES) {
      await updateUsageEventOutcome(service, requestId, "rejected");
      return withRequestId(
        NextResponse.json(
          {
            error: "Clips are too short. Record at least about 1 minute of audio in total (longer clips work better).",
            code: "CLIPS_TOO_SHORT",
            required_bytes: MIN_TOTAL_BYTES,
            actual_bytes: totalBytesFromDb,
          },
          { status: 400 }
        ),
        requestId
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
        return withRequestId(
          NextResponse.json(
            {
              error: "Could not start voice creation. Ensure database migrations are applied.",
              code: "LOCK_FAILED",
              status,
              detail: String(dbMessage).slice(0, 200),
            },
            { status: 500 }
          ),
          requestId
        );
      }
      return withRequestId(
        NextResponse.json({ status }),
        requestId
      );
    }

    logEvent({
      event: "voice_create_processing",
      requestId,
      userId: user.id,
      voiceProfileId,
      outcome: "success",
      meta: { clipCount: clipCount ?? 0, totalBytes: totalBytesFromDb },
    });

    // Download clips from storage
    const { data: clips, error: clipsError } = await supabase
      .from("training_clips")
      .select("id, storage_bucket, storage_path")
      .eq("voice_profile_id", voiceProfileId)
      .eq("status", "uploaded")
      .order("created_at", { ascending: true });

    if (clipsError || !clips?.length) {
      await supabase
        .from("voice_profiles")
        .update({
          status: "failed",
          last_error_code: "NO_CLIPS",
          last_error_message: "No valid clips found",
          last_error_at: new Date().toISOString(),
        })
        .eq("id", voiceProfileId)
        .eq("user_id", user.id)
        .eq("status", "processing"); // monotonic guard
      await updateUsageEventOutcome(service, requestId, "error");
      return withRequestId(
        NextResponse.json({ status: "failed", error: "No valid clips found" }, { status: 500 }),
        requestId
      );
    }

    const audioBlobs: Blob[] = [];
    for (const clip of clips) {
      const { data: blob, error: dlError } = await service.storage
        .from(clip.storage_bucket)
        .download(clip.storage_path);
      if (dlError || !blob) {
        logError({ event: "voice_create_clip_download_failed", requestId, userId: user.id, voiceProfileId, error: dlError, meta: { clipId: clip.id } });
        continue;
      }
      audioBlobs.push(blob);
    }

    if (audioBlobs.length < MIN_CLIP_COUNT) {
      await supabase
        .from("voice_profiles")
        .update({
          status: "failed",
          last_error_code: "DOWNLOAD_FAILED",
          last_error_message: "Could not load enough clips from storage",
          last_error_at: new Date().toISOString(),
        })
        .eq("id", voiceProfileId)
        .eq("user_id", user.id)
        .eq("status", "processing"); // monotonic guard
      await updateUsageEventOutcome(service, requestId, "error");
      return withRequestId(
        NextResponse.json({ status: "failed", error: "Could not load enough clips" }, { status: 500 }),
        requestId
      );
    }

    const totalBytes = audioBlobs.reduce((sum, b) => sum + b.size, 0);
    if (totalBytes < MIN_TOTAL_BYTES) {
      await supabase
        .from("voice_profiles")
        .update({
          status: "failed",
          last_error_code: "CLIPS_TOO_SHORT",
          last_error_message: `Total audio too short (${Math.round(totalBytes / 1024)} KB).`,
          last_error_at: new Date().toISOString(),
        })
        .eq("id", voiceProfileId)
        .eq("user_id", user.id)
        .eq("status", "processing"); // monotonic guard
      await updateUsageEventOutcome(service, requestId, "error");
      return withRequestId(
        NextResponse.json(
          {
            status: "failed",
            error: "Clips are too short. Record at least about 1 minute of audio in total.",
            code: "CLIPS_TOO_SHORT",
          },
          { status: 400 }
        ),
        requestId
      );
    }

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

      return withRequestId(
        NextResponse.json({ status: "ready", next: "continue" }),
        requestId
      );
    }

    // ElevenLabs failed
    const isTimeout = result.status === 504;
    const safeMessage = sanitizeErrorMessage(result.message);
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

    // Monotonic guard
    await supabase
      .from("voice_profiles")
      .update({
        status: "failed",
        last_error_code: result.code ?? String(result.status),
        last_error_message: safeMessage,
        last_error_at: new Date().toISOString(),
      })
      .eq("id", voiceProfileId)
      .eq("user_id", user.id)
      .eq("status", "processing"); // monotonic guard

    await updateUsageEventOutcome(service, requestId, "error", durationSince(startMs));
    const retryAllowed = (profile.attempt_count ?? 0) + 1 < VOICE_PROFILE_MAX_ATTEMPTS;
    return withRequestId(
      NextResponse.json(
        { status: "failed", error: safeMessage, retry_available: retryAllowed },
        { status: result.status >= 500 ? 502 : 400 }
      ),
      requestId
    );
  } catch (err) {
    const { body, status } = handleRouteError(err, requestId);
    return withRequestId(NextResponse.json(body, { status }), requestId);
  }
}
