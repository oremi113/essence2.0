'use client';

/**
 * Cross-journey funnel telemetry wrapper.
 *
 * The Step 6 (message creation) middle of the funnel is already instrumented
 * (see step6.ts). This wrapper covers the rest of the V1 validation funnel —
 * the anchors that answer "did they get in, did they pay, did their voice come
 * out, and did they come back?":
 *
 *   onboarding_completed → subscription_started → voice_profile_ready
 *     → [step6.message_saved — already instrumented] → app_opened (return)
 *
 * Thin layer over track() that auto-attaches the same global-prop envelope as
 * step6.* (session_id, app_env, app_version, platform, device_type,
 * schema_version) via the shared analytics context. user_id is added
 * server-side by /api/analytics. No PII or content — only behavioral facts and
 * non-secret identifiers (e.g. voice_profile_id).
 *
 * Event names and prop schemas: docs/analytics/2026-06-16-journey-funnel-events.md.
 */

import { track } from './client';
import {
  getAppEnv,
  getAppVersion,
  getDeviceType,
  getOrCreateSessionId,
  getPlatform,
} from './context';

/** Bump on any breaking change to journey.* event names, props, or enums. */
const SCHEMA_VERSION = 1;

/**
 * Funnel event names (bare — the `journey.` namespace is added by
 * trackJourney). Kept as a const map so call sites can't fat-finger a name
 * that the /api/analytics allowlist would silently drop.
 */
export const JOURNEY_EVENTS = {
  /** Onboarding wizard completed — user is fully signed up and in the app. */
  onboardingCompleted: 'onboarding_completed',
  /** Post-checkout return from Stripe — the subscription conversion moment. */
  subscriptionStarted: 'subscription_started',
  /** Preserved voice finished training and is usable. */
  voiceProfileReady: 'voice_profile_ready',
  /** Authenticated, onboarded app entry — the returning-session signal. */
  appOpened: 'app_opened',
} as const;

export type JourneyEvent = (typeof JOURNEY_EVENTS)[keyof typeof JOURNEY_EVENTS];

/**
 * Fire a journey-funnel telemetry event.
 *
 * @param action  Bare event name (use a JOURNEY_EVENTS value). Sent as
 *                `journey.<action>`.
 * @param props   Event-specific props per the analytics doc. Reserved global
 *                props always win over caller props (a fat-fingered
 *                schema_version can't corrupt the envelope).
 */
export function trackJourney(
  action: JourneyEvent,
  props: Record<string, unknown> = {}
): void {
  const meta: Record<string, unknown> = {
    ...props,
    session_id: getOrCreateSessionId(),
    app_env: getAppEnv(),
    app_version: getAppVersion(),
    platform: getPlatform(),
    device_type: getDeviceType(),
    schema_version: SCHEMA_VERSION,
  };

  track(`journey.${action}`, meta);
}
