import "server-only";
import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Profile-photo storage helpers. Bucket is private; display flows use a
 * short-lived signed URL fetched server-side. Mirrors the audio storage
 * pattern in src/lib/audio/storage-paths.ts.
 */

export const AVATAR_BUCKET = "profile-photos" as const;

/** Max upload size enforced both client-side (compression target) and server-side. */
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2MB

export const AVATAR_ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
export type AvatarMime = (typeof AVATAR_ALLOWED_MIME)[number];

/** users/{userId}/avatar.{ext} — overwritten in place on re-upload. */
export function avatarObjectPath(userId: string, extension: string): string {
  return `users/${userId}/avatar.${extension}`;
}

export function extensionForMime(mime: string): string | null {
  switch (mime) {
    case "image/jpeg": return "jpg";
    case "image/png":  return "png";
    case "image/webp": return "webp";
    default:           return null;
  }
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
