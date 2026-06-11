import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Unit tests for the Step 6 (message creation) telemetry wrapper.
 *
 * Covers the flow_id lifecycle (mint / read / clear, sessionStorage
 * persistence), session_id stability, and trackStep6's contract:
 * namespacing the action, merging caller props, and auto-attaching the
 * global props every step6.* event needs per
 * docs/analytics/2026-06-01-step6-events.md.
 *
 * track() is mocked so we assert what step6 hands the transport, not the
 * network.
 */

const trackMock = vi.fn();
vi.mock('@/lib/analytics/client', () => ({
  track: (action: string, meta?: Record<string, unknown>) => trackMock(action, meta),
}));

import {
  mintFlowId,
  getFlowId,
  clearFlowId,
  trackStep6,
} from '@/lib/analytics/step6';

const FLOW_ID_STORAGE_KEY = 'step6.current_flow_id';
const SESSION_ID_STORAGE_KEY = 'analytics.session_id';

beforeEach(() => {
  window.sessionStorage.clear();
  trackMock.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ----- flow_id lifecycle ---------------------------------------------------

describe('mintFlowId', () => {
  it('returns an id and persists it to sessionStorage under the flow key', () => {
    const id = mintFlowId();
    expect(id).toBeTruthy();
    expect(window.sessionStorage.getItem(FLOW_ID_STORAGE_KEY)).toBe(id);
  });

  it('mints a fresh, distinct id on each call and overwrites the stored one', () => {
    const first = mintFlowId();
    const second = mintFlowId();
    expect(second).not.toBe(first);
    expect(window.sessionStorage.getItem(FLOW_ID_STORAGE_KEY)).toBe(second);
  });
});

describe('getFlowId', () => {
  it('returns null when no flow is active', () => {
    expect(getFlowId()).toBeNull();
  });

  it('returns the currently minted flow_id', () => {
    const id = mintFlowId();
    expect(getFlowId()).toBe(id);
  });

  it('reflects a value written directly to storage', () => {
    window.sessionStorage.setItem(FLOW_ID_STORAGE_KEY, 'externally-set');
    expect(getFlowId()).toBe('externally-set');
  });
});

describe('clearFlowId', () => {
  it('removes the flow_id so getFlowId returns null again', () => {
    mintFlowId();
    clearFlowId();
    expect(getFlowId()).toBeNull();
    expect(window.sessionStorage.getItem(FLOW_ID_STORAGE_KEY)).toBeNull();
  });

  it('is a no-op when no flow is active', () => {
    expect(() => clearFlowId()).not.toThrow();
    expect(getFlowId()).toBeNull();
  });
});

// ----- trackStep6 contract -------------------------------------------------

describe('trackStep6', () => {
  it('namespaces the action under step6.', () => {
    trackStep6('flow_started');
    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock.mock.calls[0][0]).toBe('step6.flow_started');
  });

  it('attaches the current flow_id', () => {
    const id = mintFlowId();
    trackStep6('recipient_selected');
    expect(trackMock.mock.calls[0][1]).toMatchObject({ flow_id: id });
  });

  it('sends flow_id: null when no flow is active', () => {
    trackStep6('flow_started');
    expect(trackMock.mock.calls[0][1]).toMatchObject({ flow_id: null });
  });

  it('merges caller props without dropping them', () => {
    trackStep6('recipient_selected', {
      relationship: 'daughter',
      is_new_recipient: true,
    });
    expect(trackMock.mock.calls[0][1]).toMatchObject({
      relationship: 'daughter',
      is_new_recipient: true,
    });
  });

  it('attaches the global props the analytics doc requires', () => {
    trackStep6('flow_started');
    const meta = trackMock.mock.calls[0][1] as Record<string, unknown>;
    expect(meta).toHaveProperty('session_id');
    expect(meta).toHaveProperty('schema_version', 1);
    expect(meta).toHaveProperty('app_env');
    expect(meta).toHaveProperty('app_version');
    expect(['web', 'ios', 'android']).toContain(meta.platform);
    expect(['mobile', 'tablet', 'desktop']).toContain(meta.device_type);
  });

  it('mints a session_id on first use and persists it', () => {
    trackStep6('flow_started');
    const sessionId = window.sessionStorage.getItem(SESSION_ID_STORAGE_KEY);
    expect(sessionId).toBeTruthy();
    expect(trackMock.mock.calls[0][1]).toMatchObject({ session_id: sessionId });
  });

  it('keeps session_id stable across events', () => {
    trackStep6('flow_started');
    trackStep6('recipient_selected');
    const first = (trackMock.mock.calls[0][1] as Record<string, unknown>).session_id;
    const second = (trackMock.mock.calls[1][1] as Record<string, unknown>).session_id;
    expect(second).toBe(first);
  });

  it('does not let caller props override the reserved global props', () => {
    // A caller that fat-fingers schema_version must not corrupt the envelope.
    const id = mintFlowId();
    trackStep6('flow_started', { schema_version: 999, flow_id: 'spoofed' });
    expect(trackMock.mock.calls[0][1]).toMatchObject({
      schema_version: 1,
      flow_id: id,
    });
  });
});
