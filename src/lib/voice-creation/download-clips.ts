import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Minimum number of usable clips required to start voice creation. */
export const MIN_CLIP_COUNT = 10;

/** Minimum total audio bytes (~1 min at low bitrate) required to start. */
export const MIN_TOTAL_BYTES = 100 * 1024; // 100 KB

/**
 * Discriminated result of attempting to download all uploaded clips for
 * a voice profile. The route uses the `kind` to pick the next step:
 * either continue with `blobs` or short-circuit with a typed error.
 */
export type ClipDownloadResult =
  | { kind: "ok"; blobs: Blob[]; totalBytes: number }
  | { kind: "no-clips" }
  | { kind: "download-failed"; downloaded: number }
  | { kind: "too-short"; totalBytes: number };

/**
 * Fetch every uploaded clip row for the profile, download each from
 * Storage, and validate the result against the minimum-clip and
 * minimum-bytes thresholds.
 *
 * Caller is responsible for marking the profile failed and emitting
 * structured logs based on the returned `kind`. This function only
 * touches Storage + the training_clips table; it never updates the
 * voice profile row.
 *
 * @param supabase Read-side client (auth scoped to the user).
 * @param service  Service-role client used for Storage downloads.
 * @param voiceProfileId The profile whose clips we're loading.
 * @param onClipDownloadError Called once per failed clip download
 *        so the route can log structured per-clip errors.
 */
export async function downloadClipsForVoiceProfile(
  supabase: SupabaseClient,
  service: SupabaseClient,
  voiceProfileId: string,
  onClipDownloadError?: (clipId: string, error: unknown) => void
): Promise<ClipDownloadResult> {
  const { data: clips, error: clipsError } = await supabase
    .from("training_clips")
    .select("id, storage_bucket, storage_path")
    .eq("voice_profile_id", voiceProfileId)
    .eq("status", "uploaded")
    .order("created_at", { ascending: true });

  if (clipsError || !clips?.length) {
    return { kind: "no-clips" };
  }

  const blobs: Blob[] = [];
  for (const clip of clips) {
    const { data: blob, error: dlError } = await service.storage
      .from(clip.storage_bucket)
      .download(clip.storage_path);
    if (dlError || !blob) {
      onClipDownloadError?.(clip.id, dlError);
      continue;
    }
    blobs.push(blob);
  }

  if (blobs.length < MIN_CLIP_COUNT) {
    return { kind: "download-failed", downloaded: blobs.length };
  }

  const totalBytes = blobs.reduce((sum, b) => sum + b.size, 0);
  if (totalBytes < MIN_TOTAL_BYTES) {
    return { kind: "too-short", totalBytes };
  }

  return { kind: "ok", blobs, totalBytes };
}
