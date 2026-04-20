import "server-only";
import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Profile-photo storage helpers. Bucket is private; display flows use a
 * short-lived signed URL fetched server-side. Mirrors the audio storage
 * pattern in src/lib/audio/storage-paths.ts.
 *
 * Client-safe constants (`AVATAR_ALLOWED_MIME`, `AVATAR_MAX_BYTES`,
 * `extensionForMime`, `AvatarMime`) live in ./avatar-shared so the
 * Screen 10 upload hook can import them without pulling `server-only`.
 * Re-exported here for existing server-side callers.
 */

export {
  AVATAR_ALLOWED_MIME,
  AVATAR_MAX_BYTES,
  extensionForMime,
  type AvatarMime,
} from "./avatar-shared";

export const AVATAR_BUCKET = "profile-photos" as const;

/** users/{userId}/avatar.{ext} — overwritten in place on re-upload. */
export function avatarObjectPath(userId: string, extension: string): string {
  return `users/${userId}/avatar.${extension}`;
}

const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour — long enough for a session

/**
 * Returns a short-lived signed URL for an avatar, or null if the profile
 * has no photo or the signed URL cannot be generated. Never throws.
 */
export async function getAvatarSignedUrl(
  serviceClient: SupabaseClient,
  bucket: string | null,
  path: string | null
): Promise<string | null> {
  if (!bucket || !path) return null;
  const { data, error } = await serviceClient
    .storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
