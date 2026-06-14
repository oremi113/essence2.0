'use client';

/**
 * C3 (Vault Limit Reached) dev sandbox — permanent per CLAUDE.md.
 *
 * The screen is static (no variants), so the rail is just a replay control.
 * Both CTAs are mocked; in production the page owns navigation (Memory Shelf
 * / C2 Waitlist) and fires the surface telemetry.
 */

import { useState } from 'react';
import { VaultLimitScreen } from '@/components/screens/messages/VaultLimitScreen';

export default function MessagesLimitDevPage() {
  const [runId, setRunId] = useState(0);
  const replay = () => setRunId((id) => id + 1);

  return (
    <>
      <div style={railStyle}>
        <div style={rowStyle}>
          <span style={rowLabelStyle}>C3 · Vault Limit</span>
          <button type="button" onClick={replay} style={chip(false)}>
            ↻ Replay
          </button>
        </div>
      </div>
      <div style={{ paddingTop: 64, maxWidth: 430, margin: '0 auto' }}>
        <VaultLimitScreen
          key={runId}
          onVisitShelf={() => alert('Mock — routes to Memory Shelf (Step 7).')}
          onSeeWhatsComing={() =>
            alert('Mock — routes to C2 Waitlist (interim: Home; not built yet).')
          }
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
