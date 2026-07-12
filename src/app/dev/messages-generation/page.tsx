'use client';

/**
 * A5 (Generation) dev sandbox — permanent per CLAUDE.md.
 *
 * Variants:
 *   Working        — the breathing wait. Copy beats advance live:
 *                    1 "Shaping" → 2 "Listening" (4s) → 3 "Almost there" (9s).
 *                    ↻ Replay re-arms the progression from beat 1.
 *   Failed · note  — smaller warm stone, "Your note is kept" reassurance,
 *                    "Try again" + "Adjust your note".
 *   Failed · skip  — retry alone (no note to adjust).
 *
 * The screen owns the beat timer internally (it's pure presentation); the
 * rail just swaps `status` / `hasNote` and remounts to replay. onRetry /
 * onAdjustNote log + alert in place of the real /generate + A4 routing.
 */

import { useCallback, useState } from 'react';
import { GenerationScreen } from '@/components/screens/messages/GenerationScreen';
import type { GenerationStatus } from '@/components/screens/messages/GenerationScreen.types';

type VariantKey =
  | 'working'
  | 'failed-note'
  | 'failed-skip'
  | 'exhausted-note'
  | 'exhausted-skip';

const VARIANTS: Record<
  VariantKey,
  {
    label: string;
    status: GenerationStatus;
    hasNote: boolean;
    retriesExhausted: boolean;
    hint: string;
  }
> = {
  working: {
    label: 'Working',
    status: 'working',
    hasNote: true,
    retriesExhausted: false,
    hint: 'Beats advance live: 1 “Shaping” → 2 “Listening” (5s) → 3 “In your voice” (10s).',
  },
  'failed-note': {
    label: 'Failed · note',
    status: 'failed',
    hasNote: true,
    retriesExhausted: false,
    hint: 'Note path — reassurance + “Adjust your note” fallback.',
  },
  'failed-skip': {
    label: 'Failed · skip',
    status: 'failed',
    hasNote: false,
    retriesExhausted: false,
    hint: 'Skip path — retry alone, no note to adjust.',
  },
  'exhausted-note': {
    label: 'Exhausted · note',
    status: 'failed',
    hasNote: true,
    retriesExhausted: true,
    hint: '3-attempt ceiling — contact-as-care primary, quiet “Try once more”.',
  },
  'exhausted-skip': {
    label: 'Exhausted · skip',
    status: 'failed',
    hasNote: false,
    retriesExhausted: true,
    hint: '3-attempt ceiling, skip path — contact-as-care + “Try once more”.',
  },
};

export default function MessagesGenerationDevPage() {
  const [variant, setVariant] = useState<VariantKey>('working');
  const [runId, setRunId] = useState(0);

  const remount = useCallback(() => setRunId((id) => id + 1), []);
  const v = VARIANTS[variant];

  return (
    <>
      <div style={railStyle}>
        <div style={rowStyle}>
          {(Object.keys(VARIANTS) as VariantKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setVariant(key);
                remount();
              }}
              style={chip(variant === key)}
            >
              {VARIANTS[key].label}
            </button>
          ))}
          <button type="button" onClick={remount} style={chip(false)}>
            ↻ Replay
          </button>
        </div>
        <div style={{ opacity: 0.5, fontSize: 11 }}>{v.hint}</div>
      </div>
      <div style={{ paddingTop: 96, maxWidth: 430, margin: '0 auto' }}>
        <GenerationScreen
          key={`${variant}-${runId}`}
          recipientName="Sarah"
          categoryLabel="Encouragement"
          status={v.status}
          hasNote={v.hasNote}
          retriesExhausted={v.retriesExhausted}
          onRetry={() => {
            console.log('[dev/messages-generation] retry → re-runs /generate, back to working');
            alert('Mock retry — re-runs /generate (back to the working wait).');
            setVariant('working');
            remount();
          }}
          onAdjustNote={() => {
            console.log('[dev/messages-generation] adjust note → routes to A4 (note pre-filled)');
            alert('Mock — routes back to A4 with the note pre-filled.');
          }}
          onContactSupport={() => {
            console.log('[dev/messages-generation] contact support → mailto (page-owned)');
            alert('Mock — opens the support mailto (placeholder address, FOLLOW_UPS #75).');
          }}
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
