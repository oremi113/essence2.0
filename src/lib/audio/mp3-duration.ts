/**
 * Duration of a constant-bitrate mp3, derived from its byte length.
 *
 * ElevenLabs TTS returns CBR mp3 (the default output format is
 * mp3_44100_128 — 128 kbps), so duration follows exactly from size:
 * ms = bytes × 8 bits ÷ kbps. Accurate to within one mp3 frame (~26 ms)
 * plus negligible header bytes; NOT valid for VBR files.
 *
 * Used by the Step 6 render paths to populate
 * pending_generations.audio_duration_ms (FOLLOW_UPS #37).
 */
export const ELEVENLABS_MP3_BITRATE_KBPS = 128;

export function mp3DurationMsFromByteLength(
  byteLength: number,
  bitrateKbps: number = ELEVENLABS_MP3_BITRATE_KBPS,
): number | null {
  if (!Number.isFinite(byteLength) || byteLength <= 0) return null;
  if (!Number.isFinite(bitrateKbps) || bitrateKbps <= 0) return null;
  return Math.round((byteLength * 8) / bitrateKbps);
}
