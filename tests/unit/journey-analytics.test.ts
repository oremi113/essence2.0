import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Unit tests for the cross-journey funnel telemetry wrapper.
 *
 * Covers trackJourney's contract: namespacing the action under journey.,
 * merging caller props, auto-attaching the global-prop envelope per
 * docs/analytics/2026-06-16-journey-funnel-events.md, session_id stability,
 * and that reserved globals can't be spoofed by caller props.
 *
 * track() is mocked so we assert what journey hands the transport, not the
 * network.
 */

const trackMock = vi.fn();
vi.mock('@/lib/analytics/client', () => ({
  track: (action: string, meta?: Record<string, unknown>) => trackMock(action, meta),
}));

import { trackJourney, JOURNEY_EVENTS } from '@/lib/analytics/journey';

const SESSION_ID_STORAGE_KEY = 'analytics.session_id';

beforeEach(() => {
  window.sessionStorage.clear();
  trackMock.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('JOURNEY_EVENTS', () => {
  it('exposes the four V1 funnel event names', () => {
    expect(JOURNEY_EVENTS).toEqual({
      onboardingCompleted: 'onboarding_completed',
      subscriptionStarted: 'subscription_started',
      voiceProfileReady: 'voice_profile_ready',
      appOpened: 'app_opened',
    });
  });
});

describe('trackJourney', () => {
  it('namespaces the action under journey.', () => {
    trackJourney(JOURNEY_EVENTS.onboardingCompleted);
    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock.mock.calls[0][0]).toBe('journey.onboarding_completed');
  });

  it('merges caller props without dropping them', () => {
    trackJourney(JOURNEY_EVENTS.subscriptionStarted, {
      subscription_status: 'trial',
    });
    expect(trackMock.mock.calls[0][1]).toMatchObject({
      subscription_status: 'trial',
    });
  });

  it('attaches the global props the analytics doc requires', () => {
    trackJourney(JOURNEY_EVENTS.appOpened);
    const meta = trackMock.mock.calls[0][1] as Record<string, unknown>;
    expect(meta).toHaveProperty('session_id');
    expect(meta).toHaveProperty('schema_version', 1);
    expect(meta).toHaveProperty('app_env');
    expect(meta).toHaveProperty('app_version');
    expect(['web', 'ios', 'android']).toContain(meta.platform);
    expect(['mobile', 'tablet', 'desktop']).toContain(meta.device_type);
  });

  it('does not attach a flow_id (journey events are not flow-scoped)', () => {
    trackJourney(JOURNEY_EVENTS.appOpened);
    expect(trackMock.mock.calls[0][1]).not.toHaveProperty('flow_id');
  });

  it('mints a session_id on first use and persists it', () => {
    trackJourney(JOURNEY_EVENTS.onboardingCompleted);
    const sessionId = window.sessionStorage.getItem(SESSION_ID_STORAGE_KEY);
    expect(sessionId).toBeTruthy();
    expect(trackMock.mock.calls[0][1]).toMatchObject({ session_id: sessionId });
  });

  it('keeps session_id stable across events', () => {
    trackJourney(JOURNEY_EVENTS.onboardingCompleted);
    trackJourney(JOURNEY_EVENTS.appOpened);
    const first = (trackMock.mock.calls[0][1] as Record<string, unknown>).session_id;
    const second = (trackMock.mock.calls[1][1] as Record<string, unknown>).session_id;
    expect(second).toBe(first);
  });

  it('reuses an existing session_id minted by another event family', () => {
    // step6.* and journey.* share the same session key — one tab session reads
    // as one session across both.
    window.sessionStorage.setItem(SESSION_ID_STORAGE_KEY, 'shared-session');
    trackJourney(JOURNEY_EVENTS.appOpened);
    expect(trackMock.mock.calls[0][1]).toMatchObject({ session_id: 'shared-session' });
  });

  it('does not let caller props override the reserved global props', () => {
    trackJourney(JOURNEY_EVENTS.appOpened, {
      schema_version: 999,
      session_id: 'spoofed',
    } as Record<string, unknown>);
    const meta = trackMock.mock.calls[0][1] as Record<string, unknown>;
    expect(meta.schema_version).toBe(1);
    expect(meta.session_id).not.toBe('spoofed');
  });
});
