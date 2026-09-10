/**
 * Step 5 · First Playback — render the user's neutral voice sample, once.
 *
 * The line the user hears the first time they hear themselves preserved. It is
 * NOT a Message: no Message object is created, no recipient exists, and nothing
 * about it is addressed to anyone (MASTER_SPEC Step 5, Immutable Journey Rule 4).
 *
 * Every call to ElevenLabs is real money, so this is **single-flight**: the
 * render is claimed with a conditional update before any vendor call happens.
 * A refresh, a double-tap, a back-navigation, or two concurrent requests all
 * collapse to at most one paid render.
 *
 * Server-only.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { generateSpeech } from "@/lib/elevenlabs";
import { AUDIO_BUCKET, voiceSampleObjectPath } from "@/lib/audio/storage-paths";
import { mp3DurationMsFromByteLength } from "@/lib/audio/mp3-duration";
import { ErrorCode } from "@/lib/errors";
import { logEvent, logError, durationSince } from "@/lib/logger";
import { sanitizeErrorMessage } from "@/lib/api/sanitize";
import { bestEffortWrite } from "@/lib/supabase/checked-write";
import { VOICE_SAMPLE_LINE } from "./voice-sample-line";

export { VOICE_SAMPLE_LINE };


export type EnsureVoiceSampleResult =
  /** A sample exists (this call rendered it, or found one already there). */
  | {
      ok: true;
      audioPath: string;
      durationMs: number | null;
      /** What this sample actually says — never assume it is the current constant. */
      line: string;
      rendered: boolean;
    }
  /** Another caller holds the claim. Not an error — poll or let it finish. */
  | { ok: false; reason: "in_flight" }
  /** No usable voice yet. */
  | { ok: false; reason: "voice_not_ready" }
  | { ok: false; reason: "render_failed"; code: string };

export interface EnsureVoiceSampleParams {
  /** RLS-scoped client for the voice_profiles reads/writes. */
  supabase: SupabaseClient<Database>;
  /** Service-role client for the storage upload. */
  service: SupabaseClient;
  userId: string;
  voiceProfileId: string;
  requestId: string;
  /** Request start (ms), for duration logging. */
  startMs: number;
}

export async function ensureVoiceSample(
  params: EnsureVoiceSampleParams
): Promise<EnsureVoiceSampleResult> {
  const { supabase, service, userId, voiceProfileId, requestId, startMs } = params;

  const { data: profile, error: readError } = await supabase
    .from("voice_profiles")
    .select(
      "id, status, vendor_voice_id, sample_audio_path, sample_duration_ms, sample_line, sample_status, sample_render_count"
    )
    .eq("id", voiceProfileId)
    .eq("user_id", userId)
    .maybeSingle();

  if (readError || !profile) {
    return { ok: false, reason: "voice_not_ready" };
  }

  // Already rendered — the overwhelmingly common path once a user has been
  // through processing. Costs nothing and bills nothing.
  if (profile.sample_status === "ready" && profile.sample_audio_path) {
    return {
      ok: true,
      audioPath: profile.sample_audio_path,
      durationMs: profile.sample_duration_ms,
      line: profile.sample_line ?? VOICE_SAMPLE_LINE,
      rendered: false,
    };
  }

  if (profile.status !== "ready" || !profile.vendor_voice_id) {
    return { ok: false, reason: "voice_not_ready" };
  }

  // ── the claim ────────────────────────────────────────────────────────────
  // This is the whole idempotency guarantee, and it must happen BEFORE the
  // vendor call. `.in()` on the prior status is what makes it single-flight:
  // only a caller that transitions none|failed → rendering may spend money.
  // A concurrent caller matches zero rows and backs off.
  //
  // `sample_render_count` increments here, not on success, precisely because it
  // exists to count money spent — a render that fails after the vendor call
  // still cost something.
  const { data: claim, error: claimError } = await supabase
    .from("voice_profiles")
    .update({
      sample_status: "rendering",
      sample_render_count: (profile.sample_render_count ?? 0) + 1,
    })
    .eq("id", voiceProfileId)
    .eq("user_id", userId)
    .in("sample_status", ["none", "failed"])
    .select("id")
    .maybeSingle();

  if (claimError) {
    logError({
      event: "voice_sample_claim_failed",
      requestId,
      userId,
      voiceProfileId,
      error: claimError,
    });
    return { ok: false, reason: "render_failed", code: ErrorCode.INTERNAL_ERROR };
  }

  if (!claim) {
    // Someone else holds it, or it went ready between our read and our claim.
    logEvent({
      event: "voice_sample_claim_noop",
      requestId,
      userId,
      voiceProfileId,
      outcome: "rejected",
      meta: { reason: "already_claimed_or_ready" },
    });
    return { ok: false, reason: "in_flight" };
  }

  // ── the paid call ────────────────────────────────────────────────────────

  const tts = await generateSpeech({
    voiceId: profile.vendor_voice_id,
    text: VOICE_SAMPLE_LINE,
  });

  if (!tts.ok) {
    const code = tts.status === 504 ? ErrorCode.TTS_TIMEOUT : ErrorCode.TTS_FAILED;
    // Release the claim so a retry is possible. Best-effort: the render already
    // failed and a failed release must not mask it. A stuck 'rendering' would
    // wedge the beat forever, so this write matters — but not more than
    // reporting the real failure.
    await bestEffortWrite(
      supabase
        .from("voice_profiles")
        .update({ sample_status: "failed" })
        .eq("id", voiceProfileId)
        .eq("user_id", userId),
      { op: "voice_sample_status_failed_mark", requestId, userId, meta: { voiceProfileId, stage: "tts" } }
    );
    logEvent({
      event: "voice_sample_render_failed",
      requestId,
      userId,
      voiceProfileId,
      outcome: "error",
      errorCode: code,
      durationMs: durationSince(startMs),
      meta: { ttsStatus: tts.status },
    });
    return { ok: false, reason: "render_failed", code };
  }

  const audioPath = voiceSampleObjectPath(userId, voiceProfileId);
  const { error: uploadError } = await service.storage
    .from(AUDIO_BUCKET)
    .upload(audioPath, tts.audioBuffer, { contentType: "audio/mpeg", upsert: true });

  if (uploadError) {
    await bestEffortWrite(
      supabase
        .from("voice_profiles")
        .update({ sample_status: "failed" })
        .eq("id", voiceProfileId)
        .eq("user_id", userId),
      { op: "voice_sample_status_failed_mark", requestId, userId, meta: { voiceProfileId, stage: "upload" } }
    );
    logEvent({
      event: "voice_sample_upload_failed",
      requestId,
      userId,
      voiceProfileId,
      outcome: "error",
      errorCode: ErrorCode.STORAGE_FAILED,
      meta: { message: sanitizeErrorMessage(uploadError.message, 300) },
    });
    return { ok: false, reason: "render_failed", code: ErrorCode.STORAGE_FAILED };
  }

  const durationMs = mp3DurationMsFromByteLength(tts.audioBuffer.byteLength);

  // The object is uploaded and paid for. If this write fails the audio exists
  // but nothing points at it, and the next caller would claim and re-render —
  // billing twice. So this one is NOT best-effort: a failure is reported.
  const { error: finishError } = await supabase
    .from("voice_profiles")
    .update({
      sample_status: "ready",
      sample_audio_path: audioPath,
      sample_duration_ms: durationMs,
      // Store what was SPOKEN, not what the constant happens to say later. The
      // screen typesets this line while the audio speaks it; if the constant
      // changes, an already-rendered user must keep reading what they hear.
      sample_line: VOICE_SAMPLE_LINE,
    })
    .eq("id", voiceProfileId)
    .eq("user_id", userId);

  if (finishError) {
    logError({
      event: "voice_sample_persist_failed",
      requestId,
      userId,
      voiceProfileId,
      error: finishError,
    });
    return { ok: false, reason: "render_failed", code: ErrorCode.INTERNAL_ERROR };
  }

  logEvent({
    event: "voice_sample_rendered",
    requestId,
    userId,
    voiceProfileId,
    outcome: "success",
    durationMs: durationSince(startMs),
    meta: { audioDurationMs: durationMs, bytes: tts.audioBuffer.byteLength },
  });

  return { ok: true, audioPath, durationMs, line: VOICE_SAMPLE_LINE, rendered: true };
}
