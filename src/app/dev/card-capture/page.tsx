'use client';

import { useState } from 'react';
import { CardCapture } from '@/components/screens/step3/CardCapture';
import { CARD_CAPTURE_STATES } from '@/components/screens/step3/mockStates';

// Permanent dev sandbox for the CardCapture screen (handoff §0.5). Renders the
// pure screen against each of the 12 mock rail states with a state switcher —
// the production /dev/{name} equivalent of the prototype's dev rail. Reachable
// for every rail state; gated to local-only by src/app/dev/layout.tsx.
export default function CardCaptureDevPage() {
  const [stateId, setStateId] = useState(CARD_CAPTURE_STATES[0].id);
  const current = CARD_CAPTURE_STATES.find((s) => s.id === stateId)!;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at center, #2a2622 0%, #1C1A18 72%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
        padding: '28px 12px 64px',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6, maxWidth: 760 }}>
        {CARD_CAPTURE_STATES.map((s) => {
          const active = s.id === stateId;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setStateId(s.id)}
              style={{
                background: active ? 'var(--color-mineral)' : 'rgba(255,255,255,0.06)',
                color: active ? '#fff' : 'rgba(255,255,255,0.62)',
                border: `1px solid ${active ? 'var(--color-mineral)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 14,
                padding: '6px 11px',
                fontSize: 11,
                fontStyle: s.id === 'reduced-motion' ? 'italic' : 'normal',
                cursor: 'pointer',
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      <p style={{ color: 'rgba(255,255,255,0.44)', fontSize: 12, maxWidth: 420, textAlign: 'center' }}>
        {current.description}
      </p>

      {/* Phone-width surface. Fixed height so ceremony states center as on device. */}
      <div
        style={{
          width: 390,
          height: 812,
          borderRadius: 40,
          overflow: 'hidden',
          boxShadow: '0 0 0 10px #1A1715, 0 0 0 12px var(--color-mineral), 0 40px 90px rgba(0,0,0,0.45)',
          display: 'flex',
        }}
      >
        <CardCapture
          key={current.id}
          {...current.props}
          isolate={current.isolate}
          onBack={() => console.log('[dev] back')}
          onPlaySample={() => console.log('[dev] play sample')}
          onSelectPlan={(plan) => console.log('[dev] select plan', plan)}
          onKeep={() => console.log('[dev] keep my voice')}
          onNotNow={() => console.log('[dev] not now')}
          onCheckAgain={() => console.log('[dev] check again')}
          onResume={() => console.log('[dev] resume')}
        />
      </div>
    </div>
  );
}
