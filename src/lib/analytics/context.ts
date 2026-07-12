'use client';

/**
 * Shared analytics context — the global-prop envelope every client-side
 * event family attaches (session_id, app_env, app_version, platform,
 * device_type).
 *
 * Extracted so a new event family (journey.*) attaches the *same* envelope
 * as step6.* without re-importing the step6 wrapper. step6.ts now imports
 * these helpers from here too (FOLLOW_UPS #65 resolved), so the envelope has
 * a single definition shared across both families.
 *
 * session_id is minted lazily on first use and shared across families via
 * the same sessionStorage key step6 uses, so one tab session reads as one
 * session across step6.* and journey.* events. user_id is added server-side
 * by /api/analytics — never here. No PII or content ever lives in context.
 */

const SESSION_ID_STORAGE_KEY = 'analytics.session_id';

/** App environment, mirroring the step6 envelope. */
export function getAppEnv(): string {
  return process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV ?? 'unknown';
}

/** Build/release identifier, mirroring the step6 envelope. */
export function getAppVersion(): string {
  return process.env.NEXT_PUBLIC_APP_VERSION ?? 'unknown';
}

/**
 * Read the shared session_id, minting and persisting one on first use.
 * Returns '' when sessionStorage is unavailable (SSR, private mode, quota)
 * — analytics without a session_id is still useful.
 */
export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    const existing = window.sessionStorage.getItem(SESSION_ID_STORAGE_KEY);
    if (existing) return existing;
    const id = generateId();
    window.sessionStorage.setItem(SESSION_ID_STORAGE_KEY, id);
    return id;
  } catch {
    return '';
  }
}

export function getPlatform(): 'web' | 'ios' | 'android' {
  if (typeof navigator === 'undefined') return 'web';
  const ua = navigator.userAgent.toLowerCase();
  if (/android/.test(ua)) return 'android';
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  return 'web';
}

export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent.toLowerCase();
  if (/ipad|tablet|kindle|silk/.test(ua)) return 'tablet';
  if (/mobile|android|iphone|ipod/.test(ua)) return 'mobile';
  return 'desktop';
}

export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID.
  return Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, '0')
  ).join('');
}
