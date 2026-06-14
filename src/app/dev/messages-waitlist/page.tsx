'use client';

/**
 * C2 (Waitlist) dev sandbox — permanent per CLAUDE.md.
 *
 * Exercises both states (form + success) and both submit outcomes. The
 * "Fail submit" toggle makes the mocked onSubmit resolve false so the form's
 * retry path (error + re-enable) is testable without a server.
 */

import { useState } from 'react';
import { WaitlistScreen } from '@/components/screens/messages/WaitlistScreen';
import type { WaitlistSubmission } from '@/components/screens/messages/WaitlistScreen.types';

export default function MessagesWaitlistDevPage() {
  const [runId, setRunId] = useState(0);
  const [failSubmit, setFailSubmit] = useState(false);
  const replay = () => setRunId((id) => id + 1);

  const onSubmit = async (s: WaitlistSubmission): Promise<boolean> => {
    console.log('[dev] waitlist submit', s);
    await new Promise((r) => setTimeout(r, 600));
    return !failSubmit;
  };

  return (
    <>
      <div style={railStyle}>
        <div style={rowStyle}>
          <span style={rowLabelStyle}>C2 · Waitlist</span>
          <button type="button" onClick={replay} style={chip(false)}>
            ↻ Replay
          </button>
          <button
            type="button"
            onClick={() => setFailSubmit((v) => !v)}
            style={chip(failSubmit)}
          >
            Fail submit: {failSubmit ? 'on' : 'off'}
          </button>
        </div>
      </div>
      <div style={{ paddingTop: 56, maxWidth: 430, margin: '0 auto' }}>
        <WaitlistScreen
          key={runId}
          defaultEmail="oremi@essence.co"
          onSubmit={onSubmit}
          onBackHome={() => alert('Mock — routes to Home.')}
        />
      </div>
    </>
  );
}

const railStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
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
