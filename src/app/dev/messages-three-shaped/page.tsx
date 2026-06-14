'use client';

/**
 * C1 (Three Shaped) dev sandbox — permanent per CLAUDE.md.
 *
 * Renders the ceremony screen directly (the production trigger is a one-time
 * ?ceremony=three-shaped overlay on the 3rd save; the latch + branch live in
 * the page, not the screen). Replay re-runs the slow ceremony entrance.
 */

import { useState } from 'react';
import { ThreeShapedScreen } from '@/components/screens/messages/ThreeShapedScreen';

export default function MessagesThreeShapedDevPage() {
  const [runId, setRunId] = useState(0);
  const replay = () => setRunId((id) => id + 1);

  return (
    <>
      <div style={railStyle}>
        <div style={rowStyle}>
          <span style={rowLabelStyle}>C1 · Three Shaped</span>
          <button type="button" onClick={replay} style={chip(false)}>
            ↻ Replay
          </button>
        </div>
      </div>
      <div style={{ paddingTop: 56, maxWidth: 430, margin: '0 auto' }}>
        <ThreeShapedScreen
          key={runId}
          onSeeWhatsComing={() => alert('Mock — routes to C2 Waitlist (?from=c1).')}
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
