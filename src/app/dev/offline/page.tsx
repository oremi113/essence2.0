'use client';

/**
 * Step 10 · S10-B — offline & connection-lost dev sandbox (permanent per CLAUDE.md).
 *
 * Drives the presentational OfflineIndicator across its states directly, so the
 * pill's entrance / retreat / reconnect beat can be tuned in isolation without
 * pulling the network cable. The live signal (useConnectivity → status) is
 * exercised by LiveOfflineIndicator in the real app; here we force `status`.
 *
 * Grows with the chunk: the blocked-action gate and the hard-blocked route
 * variant (S10-B.3) will get their own rail rows as they land.
 */

import { useState } from 'react';
import {
  OfflineIndicator,
  type OfflineStatus,
} from '@/components/system/OfflineIndicator';
import {
  OfflineActionNote,
  OFFLINE_ACTION_COPY,
} from '@/components/system/OfflineActionNote';

// The rail exposes one extra state beyond the indicator's: "blocked" keeps the
// indicator offline while a network-required CTA is prevented with its note.
type DevState = OfflineStatus | 'blocked';

const STATES: { id: DevState; label: string; hint: string }[] = [
  { id: 'online', label: 'Online', hint: 'Baseline — indicator absent; everything works.' },
  { id: 'offline', label: 'Offline · passive', hint: 'Connection dropped while reading. Pill present; content stays usable.' },
  { id: 'blocked', label: 'Offline · blocked action', hint: 'A network CTA is prevented (not failed) — disabled, with a calm reason beneath.' },
  { id: 'reconnecting', label: 'Reconnecting', hint: 'Back online — the pill flips to a brief sage beat, then retreats (~1.6s).' },
];

export default function OfflineDevPage() {
  const [status, setStatus] = useState<DevState>('online');
  const hint = STATES.find((s) => s.id === status)?.hint ?? '';
  const blocked = status === 'blocked';
  // A blocked action still reads as offline on the indicator.
  const indicatorStatus: OfflineStatus = blocked ? 'offline' : status;

  return (
    <>
      <div style={railStyle}>
        <div style={rowStyle}>
          <span style={rowLabelStyle}>Step 10 · Offline</span>
          {STATES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStatus(s.id)}
              style={chip(status === s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div style={hintStyle}>{hint}</div>
      </div>

      <OfflineIndicator status={indicatorStatus} />

      {/* Mock content so the pill reads in context against a real ground. */}
      <div style={mockStyle}>
        <p style={eyebrowStyle}>A quiet moment</p>
        <h1 style={titleStyle}>The app stays with you.</h1>
        <p style={bodyStyle}>
          Offline is a condition the app calmly holds — nothing here is lost, and
          it picks right back up when you’re connected.
        </p>

        {/* Mock network-required CTA — prevented (not failed) while offline. */}
        <div style={ctaWrapStyle}>
          <button type="button" style={ctaStyle(blocked)} disabled={blocked}>
            Seal this message
          </button>
          <OfflineActionNote blocked={blocked}>
            {OFFLINE_ACTION_COPY.save}
          </OfflineActionNote>
        </div>
      </div>
    </>
  );
}

const ctaWrapStyle: React.CSSProperties = {
  marginTop: 32,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

function ctaStyle(disabled: boolean): React.CSSProperties {
  return {
    width: '100%',
    minHeight: 52,
    padding: '14px 24px',
    background: 'var(--color-mineral-dark)',
    color: '#fff',
    fontFamily: 'var(--font-body)',
    fontWeight: 600,
    fontSize: 18,
    border: 0,
    borderRadius: 'var(--radius-lg)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    transition: 'opacity var(--duration-small) var(--ease-essence)',
  };
}

const railStyle: React.CSSProperties = {
  // Anchored to the BOTTOM: the offline pill lives at the top of the viewport
  // (as it does in the real app), so a top rail would occlude the very thing
  // this sandbox exists to show.
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  zIndex: 9999,
  background: 'rgba(28,26,24,0.9)',
  color: '#fff',
  padding: '8px 12px',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  alignItems: 'center',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 11,
  letterSpacing: '0.04em',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 6,
  flexWrap: 'wrap',
  justifyContent: 'center',
  alignItems: 'center',
};

const rowLabelStyle: React.CSSProperties = {
  opacity: 0.4,
  fontSize: 10,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
};

const hintStyle: React.CSSProperties = {
  opacity: 0.55,
  fontSize: 10,
  textAlign: 'center',
  maxWidth: 340,
};

function chip(active: boolean): React.CSSProperties {
  return {
    background: active ? '#7A8088' : 'rgba(255,255,255,0.06)',
    color: active ? '#fff' : 'rgba(255,255,255,0.65)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 14,
    padding: '5px 11px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 11,
    letterSpacing: '0.04em',
  };
}

const mockStyle: React.CSSProperties = {
  minHeight: '100dvh',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  padding: '96px 28px 120px',
  maxWidth: 430,
  margin: '0 auto',
  background: 'var(--color-bg-neutral)',
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: 'var(--color-mineral)',
  marginBottom: 8,
};

const titleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 28,
  fontWeight: 600,
  lineHeight: 1.15,
  marginBottom: 12,
  color: 'var(--color-text-primary)',
};

const bodyStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontStyle: 'italic',
  fontSize: 18,
  lineHeight: 1.55,
  color: 'var(--color-text-secondary)',
};
