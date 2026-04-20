/**
 * Client-safe profile-photo constants, shared between the Screen 10
 * upload hook (client) and the `uploadAvatar` server action (server).
 *
 * Keeping the server-only storage helpers (`getAvatarSignedUrl`, etc.)
 * in avatar.ts so they can continue to `import "server-only"`.
 */

/** Max upload size — enforced client-side for fast reject, server-side for truth. */
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2MB

export const AVATAR_ALLOWED_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type AvatarMime = (typeof AVATAR_ALLOWED_MIME)[number];

export function extensionForMime(mime: string): string | null {
  switch (mime) {
    case 'image/jpeg': return 'jpg';
    case 'image/png':  return 'png';
    case 'image/webp': return 'webp';
    default:           return null;
  }
}
