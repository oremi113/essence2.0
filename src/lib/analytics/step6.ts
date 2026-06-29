'use client';

/**
 * Step 6 (message creation) telemetry wrapper.
 *
 * Thin layer over track() that auto-attaches the global props every
 * step6.* event needs per docs/analytics/2026-06-01-step6-events.md.
 *
 * flow_id is minted at step6.flow_started and stable until the flow
 * exits (save, discard, expiry). Stored in sessionStorage so it
 * survives mid-flow refresh; does NOT survive tab close — by design,
 * that becomes a new flow ("context loss = new flow" per the doc).
 *
 * user_id is added server-side by /api/analytics. session_id is
 * minted lazily here on first use, also in sessionStorage.
 */

import { track } from './client';
import {
  generateId,
  getAppEnv,
  getAppVersion,
  getDeviceType,
  getOrCreateSessionId,
  getPlatform,
} from './context';

const FLOW_ID_STORAGE_KEY = 'step6.current_flow_id';
const FLOW_STARTED_AT_STORAGE_KEY = 'step6.current_flow_started_at';
const SCHEMA_VERSION = 1;

/** Mint a new flow_id and persist it. Call from the step6.flow_started site. */
export function mintFlowId(): string {
  const id = generateId();
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.setItem(FLOW_ID_STORAGE_KEY, id);
      window.sessionStorage.setItem(FLOW_STARTED_AT_STORAGE_KEY, String(Date.now()));
    } catch {
      // SessionStorage unavailable (private mode, quota). Lose persistence
      // but proceed — analytics without flow_id is still useful.
    }
  }
  return id;
}

/**
 * Epoch-ms when the current flow_id was minted, or null if no flow is
 * active (deep link into mid-flow, cleared storage). Feeds
 * `time_from_flow_start_ms` on step6.message_saved.
 */
export function getFlowStartedAt(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(FLOW_STARTED_AT_STORAGE_KEY);
    if (!raw) return null;
    const ts = Number(raw);
    return Number.isFinite(ts) ? ts : null;
  } catch {
    return null;
  }
}

/** Read the current flow_id, or null if none is active. */
export function getFlowId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(FLOW_ID_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Clear the flow_id. Call on flow exit (save, discard, explicit back-out). */
export function clearFlowId(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(FLOW_ID_STORAGE_KEY);
    window.sessionStorage.removeItem(FLOW_STARTED_AT_STORAGE_KEY);
  } catch {
    // best-effort
  }
}

/**
 * Fire a Step 6 telemetry event.
 *
 * @param action  Bare event name (no namespace). e.g. 'flow_started'.
 *                Sent as 'step6.flow_started'.
 * @param props   Event-specific props per the analytics doc.
 */
export function trackStep6(
  action: string,
  props: Record<string, unknown> = {}
): void {
  const meta: Record<string, unknown> = {
    ...props,
    flow_id: getFlowId(),
    session_id: getOrCreateSessionId(),
    app_env: getAppEnv(),
    app_version: getAppVersion(),
    platform: getPlatform(),
    device_type: getDeviceType(),
    schema_version: SCHEMA_VERSION,
  };

  track(`step6.${action}`, meta);
}
