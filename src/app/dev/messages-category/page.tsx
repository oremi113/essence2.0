'use client';

/**
 * A3 (Category Selector) dev sandbox — permanent per CLAUDE.md.
 *
 * Variants:
 *   default        — "What do you want to say?" on the warm-phase ground.
 *   last-of-three  — warmer ground + Position-2 ceiling note + softer copy
 *                    (the third and final Vault message).
 *
 * Compose toggles:
 *   Pre-select — boots with Encouragement chosen (return-to-A3 state).
 *
 * Mock onSubmit logs + alerts in place of the orchestrator advancing to
 * A4; onBack stands in for the return to A2 (recipient).
 */

import { useCallback, useState } from 'react';
import { CategorySelectorScreen } from '@/components/screens/messages/CategorySelectorScreen';
import { getCategoryDefinition } from '@/lib/messageTemplates';

type VariantKey = 'default' | 'last-of-three';

const VARIANTS: Record<VariantKey, { label: string; isFinal: boolean; hint: string }> = {
  default: {
    label: 'A3.a · Default',
    isFinal: false,
    hint: 'Default — warm-phase ground, disabled CTA until a card is tapped.',
  },
  'last-of-three': {
    label: 'A3.b · Last of three',
    isFinal: true,
    hint: 'Final Vault message — warmer ground, ceiling note, softer copy.',
  },
};

export default function MessagesCategoryDevPage() {
  const [variant, setVariant] = useState<VariantKey>('default');
  const [preselect, setPreselect] = useState(false);
  const [runId, setRunId] = useState(0);

  const remount = useCallback(() => setRunId((id) => id + 1), []);

  const handleSubmit = useCallback((category: string) => {
    const def = getCategoryDefinition(category as never);
    console.log('[dev/messages-category] submit', { category });
    alert(
      `Mock submit — category "${def.label}" staged.\nThe orchestrator advances to A4 (Personal Note).`,
    );
  }, []);

  const handleBack = useCallback(() => {
    console.log('[dev/messages-category] back');
    alert('Mock back — returns to A2 (recipient).');
  }, []);

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
          <button
            type="button"
            onClick={() => {
              setPreselect((v) => !v);
              remount();
            }}
            style={toggleChip(preselect)}
          >
            ✓ Pre-select
          </button>
          <button type="button" onClick={remount} style={chip(false)}>
            ↻ Replay
          </button>
        </div>
        <div style={{ opacity: 0.5, fontSize: 11 }}>{VARIANTS[variant].hint}</div>
      </div>
      <div style={{ paddingTop: 96, maxWidth: 430, margin: '0 auto' }}>
        <CategorySelectorScreen
          key={`${variant}-${preselect}-${runId}`}
          recipientName="Sarah"
          isFinalOfThree={VARIANTS[variant].isFinal}
          initialCategory={preselect ? 'encouragement' : null}
          onSubmit={handleSubmit}
          onBack={handleBack}
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

function toggleChip(on: boolean): React.CSSProperties {
  return {
    ...chip(false),
    background: on ? '#7A8088' : 'rgba(255,255,255,0.06)',
    color: on ? '#fff' : 'rgba(255,255,255,0.6)',
    borderColor: on ? '#7A8088' : 'rgba(255,255,255,0.1)',
  };
}
