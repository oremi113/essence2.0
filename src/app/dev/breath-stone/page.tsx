'use client';

import { useState, useCallback } from 'react';
import { BreathStone, type BreathStoneState } from '@/components/breath-stone';

const STATES: Array<{ id: BreathStoneState; label: string; description: string }> = [
  { id: 'idle',      label: 'Idle',      description: 'Resting heartbeat — lightest, slowest, coolest.' },
  { id: 'ready',     label: 'Ready',     description: 'Awake and attentive — warm spark, subtle glow.' },
  { id: 'recording', label: 'Recording', description: 'A moment happening — strongest amplitude, warm bloom.' },
  { id: 'working',   label: 'Working',   description: 'Patient processing — slow + cool, but alive (4.8s breath).' },
  { id: 'celebrate', label: 'Celebrate', description: 'A single swell — warm, bright, expansive. Returns to idle.' },
  { id: 'playback',  label: 'Playback',  description: 'Memory echo — rhythmic speech cadence, slight vignette.' },
  { id: 'shimmer',   label: 'Shimmer',   description: 'Ceremonial stillness — surface sheen moves, body barely breathes.' },
  { id: 'guidance',  label: 'Guidance',  description: 'Gentle directive — calm, slightly warm.' },
  { id: 'infused',   label: 'Infused',   description: 'Voice preserved — deep, rich, expanded.' },
  { id: 'archive',   label: 'Archive',   description: 'Preserved and still — no animation.' },
];

export default function BreathStoneDevPage() {
  const [state, setState] = useState<BreathStoneState>('idle');

  // When celebrate finishes inside the engine, mirror the reset in React state
  // so the active button returns to idle.
  const handleCelebrateEnd = useCallback(() => {
    setState('idle');
  }, []);

  const current = STATES.find((s) => s.id === state)!;

  return (
    <div
      style={{ backgroundColor: '#FBF8F4', minHeight: '100vh' }}
      className="flex flex-col items-center justify-start px-6 py-16"
    >
      {/* Large interactive panel — stone centered on cream */}
      <div className="flex items-center justify-center" style={{ width: 480, height: 480 }}>
        <BreathStone
          state={state}
          size={320}
          onCelebrateEnd={handleCelebrateEnd}
        />
      </div>

      {/* Current state name — Spectral display font */}
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-h2)',
          color: '#1C1A18',
          marginTop: 8,
        }}
      >
        {current.label}
      </div>

      {/* One-line description */}
      <p
        style={{
          color: '#6B6B6B',
          fontSize: 'var(--text-body)',
          marginTop: 8,
          maxWidth: 520,
          textAlign: 'center',
        }}
      >
        {current.description}
      </p>

      {/* State selector buttons — all 10 states */}
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3" style={{ maxWidth: 720 }}>
        {STATES.map((s) => {
          const active = s.id === state;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setState(s.id)}
              className={
                active
                  ? 'bg-[#7A8088] text-[#FBF8F4]'
                  : 'bg-[#F5F0EA] text-[#1C1A18]'
              }
              style={{
                padding: '10px 18px',
                borderRadius: 'var(--radius-pill)',
                fontSize: 'var(--text-small)',
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 200ms var(--ease-essence)',
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
