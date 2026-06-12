/**
 * Shared pending-audio step for Step 6 generation.
 *
 * Used by both POST /generate and POST /regenerate (retry_audio mode): given
 * final text, synthesize speech via ElevenLabs, upload to the pending storage
 * path, and flip `audio_status`. On failure it marks `audio_status = 'failed'`
 * and leaves the row recoverable (generated_text intact) for a retry.
 *
 * Server-only.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateSpeech, type SpeechVoiceSettings } from "@/lib/elevenlabs";
import { AUDIO_BUCKET, pendingGenerationAudioPath } from "@/lib/audio/storage-paths";
import { mp3DurationMsFromByteLength } from "@/lib/audio/mp3-duration";
import { ErrorCode } from "@/lib/errors";
import { logEvent, durationSince } from "@/lib/logger";
import { sanitizeErrorMessage } from "@/lib/api/sanitize";

export type GenerateAudioParams = {
  /** RLS-scoped client used for the pending_generations status writes. */
  supabase: SupabaseClient;
  /** Service-role client used for the storage upload. */
  service: SupabaseClient;
  userId: string;
  generationId: string;
  voiceId: string;
  text: string;
  requestId: string;
  /** Request start (ms) for duration logging. */
  startMs: number;
  /** Per-category voice tuning. Omitted → ElevenLabs defaults. */
  voiceSettings?: SpeechVoiceSettings;
};

export type AudioOutcome =
  | { ok: true; audioPath: string; durationMs: number | null }
  | { ok: false; code: string };

export async function generateAndStoreAudio(params: GenerateAudioParams): Promise<AudioOutcome> {
  const { supabase, service, userId, generationId, voiceId, text, requestId, startMs, voiceSettings } = params;

  const tts = await generateSpeech({ voiceId, text, voiceSettings });
  if (!tts.ok) {
    const code = tts.status === 504 ? ErrorCode.TTS_TIMEOUT : ErrorCode.TTS_FAILED;
    await supabase
      .from("pending_generations")
      .update({ audio_status: "failed" })
      .eq("generation_id", generationId)
      .eq("user_id", userId);
    logEvent({
      event: "step6_audio_failed",
      requestId,
      userId,
      outcome: "error",
      errorCode: code,
      durationMs: durationSince(startMs),
      meta: { generationId, ttsStatus: tts.status },
    });
    return { ok: false, code };
  }

  const audioPath = pendingGenerationAudioPath(userId, generationId);
  const { error: uploadError } = await service.storage
    .from(AUDIO_BUCKET)
    .upload(audioPath, tts.audioBuffer, { contentType: "audio/mpeg", upsert: true });

  if (uploadError) {
    await supabase
      .from("pending_generations")
      .update({ audio_status: "failed" })
      .eq("generation_id", generationId)
      .eq("user_id", userId);
    logEvent({
      event: "step6_audio_upload_failed",
      requestId,
      userId,
      outcome: "error",
      errorCode: ErrorCode.STORAGE_FAILED,
      meta: { generationId, message: sanitizeErrorMessage(uploadError.message, 300) },
    });
    return { ok: false, code: ErrorCode.STORAGE_FAILED };
  }

  // ElevenLabs returns CBR mp3, so the clip's duration follows from its size.
  const durationMs = mp3DurationMsFromByteLength(tts.audioBuffer.length);

  await supabase
    .from("pending_generations")
    .update({ audio_path: audioPath, audio_status: "succeeded", audio_duration_ms: durationMs })
    .eq("generation_id", generationId)
    .eq("user_id", userId);

  return { ok: true, audioPath, durationMs };
}
