'use client';

import { useEffect, useRef, useState } from 'react';
import { Processing } from '@/components/screens/step3/Processing';
import { PROCESSING_STATES } from '@/components/screens/step3/mockStates';

// Permanent dev sandbox + tuning harness for the Processing screen (Pass 3).
// The sealed vault breathes restrained (Breath B, 2026-06-30; ember static); the
// ground shimmer is the other motion. Switching
// states animates the activation transitions (climb faint→active, exit
// active→neutral); "Play the wait" / "Gen complete" walk the full arc.
// notify-landing renders as a static shell — its cold-start re-fetch is GATED
// behind the transactional notify infra (not built yet). Local-only via
// src/app/dev/layout.tsx.
export default function ProcessingDevPage() {
  const [stateId, setStateId] = useState(PROCESSING_STATES[0].id);
  const [rm, setRm] = useState(false);
  const current = PROCESSING_STATES.find((s) => s.id === stateId)!;

  // Live shimmer readout — read the ground element's opacity each frame and
  // write it straight to the DOM (no per-frame React state).
  const shimRef = useRef<HTMLElement>(null);
  const playTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    // Sample on an interval, not per-frame — a per-frame getComputedStyle would
    // force a style recalc every frame and perturb the shimmer loop's own fps.
    const iv = setInterval(() => {
      const el = document.getElementById('shimmer');
      if (el && shimRef.current) {
        shimRef.current.textContent = parseFloat(getComputedStyle(el).opacity).toFixed(3);
      }
    }, 150);
    return () => clearInterval(iv);
  }, []);
  useEffect(() => () => { if (playTimer.current) clearTimeout(playTimer.current); }, []);

  function playWait() {
    if (playTimer.current) clearTimeout(playTimer.current);
    setStateId('processing-normal');
    // brief faint hold, then climb into the active working register
    playTimer.current = setTimeout(() => setStateId('processing-extended'), 900);
  }
  function genComplete() {
    if (playTimer.current) clearTimeout(playTimer.current);
    setStateId('neutral-exit');
  }

  // RM override lets you inspect any state in the reduced-motion rest frame.
  const reducedMotion = rm || current.props.a11y.reducedMotion;
  const props = { ...current.props, a11y: { reducedMotion } };

  const btn = (active: boolean, primary = false): React.CSSProperties => ({
    background: active ? 'var(--color-mineral)' : primary ? 'rgba(122,128,136,0.28)' : 'rgba(255,255,255,0.06)',
    color: active || primary ? '#fff' : 'rgba(255,255,255,0.62)',
    border: `1px solid ${active ? 'var(--color-mineral)' : primary ? 'rgba(122,128,136,0.5)' : 'rgba(255,255,255,0.1)'}`,
    borderRadius: 14,
    padding: '6px 11px',
    fontSize: 11,
    fontStyle: stateId === 'reduced-motion' && active ? 'italic' : 'normal',
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
        Step 3 · Processing · Pass 3
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.34)' }}>Arc</span>
        <button id="btn-play" type="button" style={btn(false, true)} onClick={playWait}>Play the wait</button>
        <button id="btn-exit" type="button" style={btn(false)} onClick={genComplete}>Gen complete (exit)</button>
        <span style={{ marginLeft: 10, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.34)' }}>Reduced motion</span>
        <button id="btn-rm" type="button" style={btn(rm)} onClick={() => setRm((v) => !v)}>{rm ? 'On' : 'Off'}</button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6, maxWidth: 760 }}>
        {PROCESSING_STATES.map((s) => (
          <button key={s.id} type="button" style={btn(s.id === stateId)} onClick={() => setStateId(s.id)}>
            {s.label}
          </button>
        ))}
      </div>

      <div
        style={{
          display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center',
          fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.04em',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12, padding: '8px 16px', maxWidth: 620,
        }}
      >
        <span>state <b style={{ color: 'rgba(255,255,255,0.82)' }}>{stateId}</b></span>
        <span>shimmer <b ref={shimRef} style={{ color: 'rgba(255,255,255,0.82)' }}>0.000</b></span>
        <span>ember <b style={{ color: '#caa15a' }}>lit (static)</b></span>
        <span style={{ color: stateId === 'notify-landing' ? '#c79b6a' : '#8fb9a6' }}>
          {stateId === 'notify-landing'
            ? 'cold-start re-fetch GATED · notify infra'
            : stateId === 'neutral-exit'
              ? 'neutral handoff frame · Reveal builds from here'
              : 'vessel breathes restrained · ember static · no pour'}
        </span>
      </div>

      <p style={{ color: 'rgba(255,255,255,0.44)', fontSize: 12, maxWidth: 420, textAlign: 'center' }}>
        {current.description}
      </p>

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
        <Processing
          {...props}
          entry={current.entry}
          onNotify={() => console.log('[dev] arm notify')}
        />
      </div>
    </div>
  );
}
