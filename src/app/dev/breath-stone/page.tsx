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
  { id: 'priming',   label: 'Priming',   description: '"Take a breath" — symmetric 3s in / 3s out, large amplitude.' },
];

// The ceremony renders the stone at 140 and 200. The shelf and message
// screens use others. The canvas artifact this page exists to catch is
// only visible on a dark ground, so dark is the default.
const SIZES = [140, 200, 280, 320];

const GROUNDS = {
  dark: { id: 'dark' as const, label: 'Dark', bg: '#0B0A09', fg: '#F5F0EA', chip: '#1E1C1A' },
  cream: { id: 'cream' as const, label: 'Cream', bg: '#FBF8F4', fg: '#1C1A18', chip: '#F5F0EA' },
};
type GroundId = keyof typeof GROUNDS;

export default function BreathStoneDevPage() {
  const [state, setState] = useState<BreathStoneState>('shimmer');
  const [size, setSize] = useState(140);
  const [ground, setGround] = useState<GroundId>('dark');
  const [showEdges, setShowEdges] = useState(false);

  // When celebrate finishes inside the engine, mirror the reset in React state
  // so the active button returns to idle.
  const handleCelebrateEnd = useCallback(() => {
    setState('idle');
  }, []);

  const current = STATES.find((s) => s.id === state)!;
  const g = GROUNDS[ground];

  return (
    <div
      style={{ backgroundColor: g.bg, minHeight: '100vh', color: g.fg }}
      className="flex flex-col items-center justify-start px-6 py-16"
    >
      {/* Stone on the selected ground. The wrapper is deliberately larger
          than the canvas so the canvas rect has room to show itself. */}
      <div className="flex items-center justify-center" style={{ width: 400, height: 400 }}>
        <div
          style={{
            position: 'relative',
            width: size,
            height: size,
            // Debug outline traces the canvas rect so a leftover box is
            // unambiguous — is that edge the artifact, or the outline?
            outline: showEdges ? '1px solid rgba(255,80,80,0.55)' : 'none',
          }}
        >
          <BreathStone
            state={state}
            size={size}
            onCelebrateEnd={handleCelebrateEnd}
          />
        </div>
      </div>

      {/* Current state name — Spectral display font */}
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-h2)',
          marginTop: 8,
        }}
      >
        {current.label} · {size}px
      </div>

      {/* One-line description */}
      <p
        style={{
          opacity: 0.65,
          fontSize: 'var(--text-body)',
          marginTop: 8,
          maxWidth: 520,
          textAlign: 'center',
        }}
      >
        {current.description}
      </p>

      {/* Ground / size / debug controls */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {(Object.keys(GROUNDS) as GroundId[]).map((id) => (
          <Chip
            key={id}
            active={ground === id}
            ground={g}
            onClick={() => setGround(id)}
          >
            {GROUNDS[id].label}
          </Chip>
        ))}
        <span style={{ opacity: 0.3 }}>|</span>
        {SIZES.map((s) => (
          <Chip key={s} active={size === s} ground={g} onClick={() => setSize(s)}>
            {s}px
          </Chip>
        ))}
        <span style={{ opacity: 0.3 }}>|</span>
        <Chip active={showEdges} ground={g} onClick={() => setShowEdges((v) => !v)}>
          Canvas rect
        </Chip>
      </div>

      {/* State selector buttons — every state */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3" style={{ maxWidth: 720 }}>
        {STATES.map((s) => (
          <Chip key={s.id} active={s.id === state} ground={g} onClick={() => setState(s.id)}>
            {s.label}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function Chip({
  active,
  ground,
  onClick,
  children,
}: {
  active: boolean;
  ground: { fg: string; bg: string; chip: string };
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '10px 18px',
        borderRadius: 'var(--radius-pill)',
        fontSize: 'var(--text-small)',
        fontWeight: 500,
        border: 'none',
        cursor: 'pointer',
        backgroundColor: active ? '#7A8088' : ground.chip,
        color: active ? '#FBF8F4' : ground.fg,
        transition: 'background-color 200ms var(--ease-essence)',
      }}
    >
      {children}
    </button>
  );
}
