'use client';

import { useState } from 'react';
import { SealStage } from '@/components/screens/step3/SealStage';
import { useSealTimeline, type SealPhase } from '@/components/screens/step3/useSealTimeline';
import { useReducedMotion } from '@/lib/animation/useReducedMotion';

// Permanent dev sandbox + tuning harness for the seal hero (Pass 2). Honors the
// DOM contract that tests/e2e/seal.spec.ts asserts:
//   #stage[data-phase|data-preseal|data-rm]   the orchestrated stage
//   #btn-trigger #btn-replay #btn-rm           seal controls
//   .preseal-btn (×3)                          §SEAL-INTEGRITY states
//   #ro-phase #ro-t #ro-ember #ro-shimmer #ro-seam #ro-guard   readout mirrors
// Gated to local-only by src/app/dev/layout.tsx.

// Pre-seal integrity states: the label is the rail state; the caption is the
// calm copy shown while the panel asserts "no seal, cool ember, shimmer 0".
const PRESEAL: Array<{ label: string; caption: string }> = [
  { label: 'confirm-hold', caption: 'Confirming your place.' },
  { label: 'confirm-timeout', caption: 'Taking a little longer.' },
  { label: 'checkout-error', caption: 'Your card was declined.' },
];

// Nominal phase offsets (ms) for the readout. Not load-bearing — the spec reads
// true timings off the data-phase MutationObserver, not this label.
const PHASE_T: Record<SealPhase, string> = {
  idle: '0ms',
  closing: '0ms',
  catching: '975ms',
  settling: '1375ms',
  sealed: '1675ms',
  handoff: '4175ms',
};

export default function SealDevPage() {
  const osReducedMotion = useReducedMotion();
  const [rm, setRm] = useState(osReducedMotion);
  const [activePreseal, setActivePreseal] = useState<string | null>(null);
  const seal = useSealTimeline(rm);

  function trigger() {
    setActivePreseal(null);
    seal.play();
  }
  function replay() {
    setActivePreseal(null);
    seal.reset();
    requestAnimationFrame(() => seal.play());
  }
  function toggleRm() {
    setActivePreseal(null);
    setRm((v) => !v);
    seal.reset();
  }
  function showPreseal(label: string, caption: string) {
    setActivePreseal(label);
    seal.showPreseal(caption);
  }

  const btn = (active: boolean, primary = false): React.CSSProperties => ({
    background: active ? 'var(--color-mineral)' : primary ? 'rgba(122,128,136,0.28)' : 'rgba(255,255,255,0.06)',
    color: active || primary ? '#fff' : 'rgba(255,255,255,0.66)',
    border: `1px solid ${active ? 'var(--color-mineral)' : primary ? 'rgba(122,128,136,0.5)' : 'rgba(255,255,255,0.12)'}`,
    borderRadius: 14,
    padding: '6px 12px',
    fontSize: 11,
    letterSpacing: '0.02em',
    cursor: 'pointer',
  });

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at center, #2a2622 0%, #15140F 72%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
        padding: '28px 12px 64px',
      }}
    >
      <div style={{ fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.46)' }}>
        Step 3 · Seal Hero · Pass 2
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.34)' }}>
          Seal
        </span>
        <button id="btn-trigger" type="button" style={btn(false, true)} onClick={trigger}>
          Trigger seal (confirmed)
        </button>
        <button id="btn-replay" type="button" style={btn(false)} onClick={replay}>
          Replay
        </button>
        <span style={{ marginLeft: 10, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.34)' }}>
          Reduced motion
        </span>
        <button id="btn-rm" type="button" style={btn(rm)} onClick={toggleRm}>
          {rm ? 'On' : 'Off'}
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.34)' }}>
          Pre-seal (integrity)
        </span>
        {PRESEAL.map((p) => (
          <button
            key={p.label}
            type="button"
            className="preseal-btn"
            style={btn(activePreseal === p.label)}
            onClick={() => showPreseal(p.label, p.caption)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 18,
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          fontSize: 11,
          color: 'rgba(255,255,255,0.5)',
          letterSpacing: '0.04em',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12,
          padding: '8px 16px',
          maxWidth: 620,
        }}
      >
        <span>phase <b id="ro-phase" style={{ color: 'rgba(255,255,255,0.82)' }}>{seal.phase}</b></span>
        <span>t <b id="ro-t" style={{ color: 'rgba(255,255,255,0.82)' }}>{PHASE_T[seal.phase]}</b></span>
        <span>ember <b id="ro-ember" style={{ color: seal.ember === 'ignited' ? '#caa15a' : 'rgba(255,255,255,0.82)' }}>{seal.ember}</b></span>
        <span>shimmer <b id="ro-shimmer" style={{ color: 'rgba(255,255,255,0.82)' }}>{seal.shimmer}</b></span>
        <span>seam <b id="ro-seam" style={{ color: 'rgba(255,255,255,0.82)' }}>{seal.seam}</b></span>
        <span id="ro-guard" style={{ color: '#8fb9a6' }}>{seal.guard}</span>
      </div>

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
        <SealStage
          id="stage"
          phase={seal.phase}
          preseal={seal.preseal}
          rm={seal.rm}
          presealCaption={seal.presealCaption}
          activeCopy={seal.activeCopy}
        />
      </div>
    </div>
  );
}
