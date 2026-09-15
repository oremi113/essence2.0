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
// Enforced, not just asserted above. This module takes a service-role client and
// spends money at ElevenLabs; until now it was kept off the client only
// TRANSITIVELY, by the `server-only` import inside `@/lib/elevenlabs`. That guard
// disappears the moment anyone puts that import behind a dynamic import, so the
// module that holds the privilege declares it itself.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { generateSpeechWithTimestamps } from "@/lib/elevenlabs";
import { wordAlignmentFrom } from "./word-alignment";
import { AUDIO_BUCKET, voiceSampleObjectPath } from "@/lib/audio/storage-paths";
import { mp3DurationMsFromByteLength } from "@/lib/audio/mp3-duration";
import { ErrorCode } from "@/lib/errors";
import { logEvent, logError, durationSince } from "@/lib/logger";
import { sanitizeErrorMessage } from "@/lib/api/sanitize";
import { bestEffortWrite } from "@/lib/supabase/checked-write";
import { VOICE_SAMPLE_LINE } from "./voice-sample-line";

export { VOICE_SAMPLE_LINE };

/**
 * How many paid renders one profile may ever be charged for.
 *
 * `failed` is deliberately re-claimable, so the beat can recover from a
 * transient vendor or storage blip instead of being silent forever. Without a
 * ceiling that is unbounded: a storage outage fails every render *after* the
 * vendor call has already been billed, and each new attempt charges again for
 * the same sample. Harmless while the only trigger was a one-time processing
 * step; a live hazard now that entering the ceremony can trigger one.
 *
 * Enforced inside the claim itself, not as a check beside it, so two concurrent
 * callers cannot both pass a ceiling read and then both spend.
 *
 * Resolves `docs/follow-ups/2026-09-10-voice-sample-retry-has-no-billing-cap.md`.
 */
export const VOICE_SAMPLE_MAX_RENDERS = (() => {
  const raw = Number(process.env.VOICE_SAMPLE_MAX_RENDERS);
  return Number.isInteger(raw) && raw > 0 ? raw : 3;
})();


export type EnsureVoiceSampleResult =
  /** A sample exists (this call rendered it, or found one already there). */
  | {
      ok: true;
      audioPath: string;
      durationMs: number | null;
      /** What this sample actually says — never assume it is the current constant. */
      line: string;
      /** Word onsets in ms, or null when the vendor gave no usable alignment. */
      wordOffsetsMs: number[] | null;
      rendered: boolean;
    }
  /** Another caller holds the claim. Not an error — poll or let it finish. */
  | { ok: false; reason: "in_flight" }
  /** No usable voice yet. */
  | { ok: false; reason: "voice_not_ready" }
  /**
   * This profile has already been billed for `VOICE_SAMPLE_MAX_RENDERS`
   * attempts and will not be charged again. Terminal without an operator
   * raising the ceiling — never retry past it.
   */
  | { ok: false; reason: "render_cap_reached"; renderCount: number }
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
      "id, status, vendor_voice_id, sample_audio_path, sample_duration_ms, sample_line, sample_word_offsets, sample_status, sample_render_count"
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
      wordOffsetsMs: (profile.sample_word_offsets as number[] | null) ?? null,
      rendered: false,
    };
  }

  if (profile.status !== "ready" || !profile.vendor_voice_id) {
    return { ok: false, reason: "voice_not_ready" };
  }

  // Fast path for the ceiling, so the common refusal is one read and a clear
  // reason rather than a claim that mysteriously matches nothing. The claim
  // below repeats the condition atomically — this check is the explanation,
  // that one is the enforcement.
  const renderCount = profile.sample_render_count ?? 0;
  if (renderCount >= VOICE_SAMPLE_MAX_RENDERS) {
    logEvent({
      event: "voice_sample_render_cap_reached",
      requestId,
      userId,
      voiceProfileId,
      outcome: "rejected",
      meta: { renderCount, cap: VOICE_SAMPLE_MAX_RENDERS },
    });
    return { ok: false, reason: "render_cap_reached", renderCount };
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
    // The billing ceiling, enforced in the same atomic update that makes the
    // render single-flight. A separate pre-check could be passed by two callers
    // at once; this cannot.
    .lt("sample_render_count", VOICE_SAMPLE_MAX_RENDERS)
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
    // Zero rows matched. Three different things look identical here — someone
    // else holds the claim, it went ready between our read and our claim, or a
    // concurrent caller just consumed the last allowed attempt. Re-read to say
    // which, because "wait a moment" and "this will never render" are opposite
    // instructions for the caller.
    const { data: current } = await supabase
      .from("voice_profiles")
      .select("sample_render_count")
      .eq("id", voiceProfileId)
      .eq("user_id", userId)
      .maybeSingle();

    const currentCount = current?.sample_render_count ?? 0;
    if (currentCount >= VOICE_SAMPLE_MAX_RENDERS) {
      logEvent({
        event: "voice_sample_render_cap_reached",
        requestId,
        userId,
        voiceProfileId,
        outcome: "rejected",
        meta: { renderCount: currentCount, cap: VOICE_SAMPLE_MAX_RENDERS, lostRace: true },
      });
      return { ok: false, reason: "render_cap_reached", renderCount: currentCount };
    }

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

  // The timestamps variant: same synthesis, same cost, plus the per-character
  // timings the reveal needs. Alignment is best-effort — audio is what matters.
  const tts = await generateSpeechWithTimestamps({
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

  const alignment = wordAlignmentFrom(tts.alignment, VOICE_SAMPLE_LINE);
  // Prefer the vendor's own measurement of the audio it just made; the
  // byte-length derivation is a fallback and carries the ID3 tag as error.
  const durationMs =
    alignment?.durationMs ?? mp3DurationMsFromByteLength(tts.audioBuffer.byteLength);

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
      // Valid only for the audio written above. Always set together — a stale
      // pairing would light the wrong words.
      sample_word_offsets: alignment?.offsetsMs ?? null,
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

  logEvent({
    event: "voice_sample_alignment",
    requestId,
    userId,
    voiceProfileId,
    outcome: alignment ? "success" : "rejected",
    meta: { words: alignment?.offsetsMs.length ?? 0, hasAlignment: Boolean(alignment) },
  });

  return {
    ok: true,
    audioPath,
    durationMs,
    line: VOICE_SAMPLE_LINE,
    wordOffsetsMs: alignment?.offsetsMs ?? null,
    rendered: true,
  };
}
