'use client';

/**
 * A7 (Save Confirmation) dev sandbox — permanent per CLAUDE.md.
 *
 * Mirrors the prototype dev rail (essence-step6-a7.html): the two variants
 * plus replay, with recipient-name-length stress chips added for the design
 * pass (the prototype's V2 backlog flags 30+ char names as the open
 * overflow question — judge it here).
 *
 *   default — message 1 or 2 of 3; secondary CTA "Create another"
 *   third   — message 3 of 3; secondary CTA "See what's coming" (→ C1)
 *
 * Both CTAs are mocked; in production the page owns navigation
 * (Memory Shelf / creation entry / C1 Three Shaped).
 */

import { useState } from 'react';
import { SaveConfirmationScreen } from '@/components/screens/messages/SaveConfirmationScreen';
import type { SaveConfirmationVariant } from '@/components/screens/messages/SaveConfirmationScreen.types';

const NAME_PRESETS: Record<string, string> = {
  '5': 'Sarah',
  '10': 'Alexandria',
  '18': 'Maria del Carmen R.',
  '32': 'Bartholomew Montgomery-Fitzwilliam',
};

const VARIANT_LABELS: Record<SaveConfirmationVariant, string> = {
  default: 'Default (msg 1 or 2)',
  third: 'Third of three',
};

export default function MessagesSavedDevPage() {
  const [variant, setVariant] = useState<SaveConfirmationVariant>('default');
  const [nameKey, setNameKey] = useState<string>('5');
  const [runId, setRunId] = useState(0);

  const replay = () => setRunId((id) => id + 1);

  return (
    <>
      <div style={railStyle}>
        <div style={rowStyle}>
          {(Object.keys(VARIANT_LABELS) as SaveConfirmationVariant[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => {
                setVariant(v);
                replay();
              }}
              style={chip(variant === v)}
            >
              {VARIANT_LABELS[v]}
            </button>
          ))}
          <button type="button" onClick={replay} style={chip(false)}>
            ↻ Replay
          </button>
        </div>
        <div style={rowStyle}>
          <span style={rowLabelStyle}>Name length</span>
          {Object.keys(NAME_PRESETS).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setNameKey(key);
                replay();
              }}
              style={chip(nameKey === key)}
            >
              {key} ch
            </button>
          ))}
        </div>
      </div>
      <div style={{ paddingTop: 96, maxWidth: 430, margin: '0 auto' }}>
        <SaveConfirmationScreen
          key={`${variant}-${nameKey}-${runId}`}
          recipientName={NAME_PRESETS[nameKey]}
          variant={variant}
          savedAtIso={new Date().toISOString()}
          onViewShelf={() => alert('Mock — routes to Memory Shelf (Step 7).')}
          onCreateAnother={() => alert('Mock — routes to message-creation entry.')}
          onSeeWhatsComing={() => alert('Mock — routes to C2 Waitlist (?from=c1).')}
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
