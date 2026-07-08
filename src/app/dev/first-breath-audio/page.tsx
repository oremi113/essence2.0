'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createFirstBreathAudio,
  PRESETS,
  type FirstBreathAudioEngine,
  type PresetId,
} from '@/lib/audio/firstBreathAudio';

/**
 * Audition sandbox for the First Breath ceremony audio (FOLLOW_UPS #41).
 *
 * Four voicings walking from the original low, filter-swept synth register
 * ("spacey") toward lighter/airier ones. Pick a preset to start its ambient
 * bed, then fire the swell / bell one-shots, or play the full timed ceremony.
 * Once a preset wins, set DEFAULT_PRESET_ID in firstBreathAudio.ts.
 *
 * Audio unlocks on the first click (browser autoplay policy) — selecting a
 * preset counts as that gesture.
 */

const PRESET_IDS = Object.keys(PRESETS) as PresetId[];

// Ceremony beat offsets from bed start (mirrors FirstBreathSequence.phases.ts:
// crystallize at 5s, reveal bell at PRESERVED_AT_MS + RING_FIRE_AT_MS = 8.5s).
const CEREMONY_SWELL_MS = 5000;
const CEREMONY_BELL_MS = 8500;

export default function FirstBreathAudioDevPage() {
  const [active, setActive] = useState<PresetId | null>(null);
  const [running, setRunning] = useState(false);
  const engineRef = useRef<FirstBreathAudioEngine | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const stop = useCallback(() => {
    clearTimers();
    engineRef.current?.dispose();
    engineRef.current = null;
    setActive(null);
    setRunning(false);
  }, [clearTimers]);

  // Tear down on unmount.
  useEffect(() => stop, [stop]);

  const selectPreset = useCallback(
    (id: PresetId) => {
      clearTimers();
      engineRef.current?.dispose();
      const engine = createFirstBreathAudio(PRESETS[id]);
      engineRef.current = engine;
      engine?.start();
      setActive(id);
      setRunning(true);
    },
    [clearTimers]
  );

  const playSwell = useCallback(() => engineRef.current?.playCrystallize(), []);
  const playBell = useCallback(() => engineRef.current?.playReveal(), []);

  const playCeremony = useCallback(
    (id: PresetId) => {
      selectPreset(id);
      timersRef.current.push(
        setTimeout(() => engineRef.current?.playCrystallize(), CEREMONY_SWELL_MS),
        setTimeout(() => engineRef.current?.playReveal(), CEREMONY_BELL_MS)
      );
    },
    [selectPreset]
  );

  return (
    <main style={rootStyle}>
      <div style={{ maxWidth: 760, width: '100%' }}>
        <h1 style={h1Style}>First Breath — audio audition</h1>
        <p style={leadStyle}>
          Click a preset to start its ambient bed, then fire the beats. All
          synthesised live — no files. When one wins, tell Claude and it becomes
          the ceremony default.
        </p>

        <div style={gridStyle}>
          {PRESET_IDS.map((id) => {
            const preset = PRESETS[id];
            const isActive = active === id;
            return (
              <div
                key={id}
                style={{
                  ...cardStyle,
                  borderColor: isActive
                    ? 'rgba(232,220,200,0.55)'
                    : 'rgba(245,240,234,0.10)',
                  background: isActive
                    ? 'rgba(245,240,234,0.06)'
                    : 'rgba(245,240,234,0.02)',
                }}
              >
                <div style={cardHeadStyle}>
                  <span style={labelStyle}>{preset.label}</span>
                  {isActive && running && <span style={dotStyle}>● bed on</span>}
                </div>
                <p style={blurbStyle}>{preset.blurb}</p>

                <div style={btnRowStyle}>
                  <button
                    type="button"
                    onClick={() => selectPreset(id)}
                    style={isActive ? primaryBtnActive : primaryBtn}
                  >
                    {isActive ? 'Restart bed' : 'Start bed'}
                  </button>
                  <button
                    type="button"
                    onClick={playSwell}
                    disabled={!isActive}
                    style={isActive ? ghostBtn : ghostBtnDisabled}
                  >
                    Swell
                  </button>
                  <button
                    type="button"
                    onClick={playBell}
                    disabled={!isActive}
                    style={isActive ? ghostBtn : ghostBtnDisabled}
                  >
                    Bell
                  </button>
                  <button
                    type="button"
                    onClick={() => playCeremony(id)}
                    style={ghostBtn}
                  >
                    ▶ Full ceremony
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
          <button type="button" onClick={stop} style={stopBtn}>
            ■ Stop
          </button>
          <span style={hintStyle}>
            “Full ceremony” = bed now → swell at 5s → bell at 8.5s (the real
            timings). Reduce-Motion has no effect here.
          </span>
        </div>
      </div>
    </main>
  );
}

// ─── Styles (screen-local, warm-on-dark to match the ceremony) ───────────────

const rootStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: 'linear-gradient(180deg, #15120F 0%, #1E1915 50%, #2A241E 100%)',
  color: '#F5F0EA',
  display: 'flex',
  justifyContent: 'center',
  padding: '56px 24px',
};

const h1Style: React.CSSProperties = {
  fontFamily: 'var(--font-display, serif)',
  fontSize: 28,
  fontWeight: 400,
  margin: 0,
};

const leadStyle: React.CSSProperties = {
  color: 'rgba(245,240,234,0.7)',
  fontSize: 15,
  lineHeight: 1.6,
  marginTop: 10,
  marginBottom: 28,
  maxWidth: 620,
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  gap: 16,
};

const cardStyle: React.CSSProperties = {
  border: '1px solid',
  borderRadius: 16,
  padding: 20,
  transition: 'border-color 200ms ease, background 200ms ease',
};

const cardHeadStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display, serif)',
  fontSize: 18,
};

const dotStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'rgba(232,200,150,0.9)',
  letterSpacing: '0.02em',
};

const blurbStyle: React.CSSProperties = {
  color: 'rgba(245,240,234,0.6)',
  fontSize: 13.5,
  lineHeight: 1.55,
  margin: '10px 0 16px',
};

const btnRowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
};

const baseBtn: React.CSSProperties = {
  borderRadius: 12,
  padding: '10px 14px',
  fontSize: 13,
  fontWeight: 600,
  border: '1px solid transparent',
  cursor: 'pointer',
};

const primaryBtn: React.CSSProperties = {
  ...baseBtn,
  background: '#E8DCC8',
  color: '#1C1A18',
};

const primaryBtnActive: React.CSSProperties = {
  ...primaryBtn,
  background: '#D8C6A6',
};

const ghostBtn: React.CSSProperties = {
  ...baseBtn,
  background: 'transparent',
  color: '#F5F0EA',
  borderColor: 'rgba(245,240,234,0.22)',
};

const ghostBtnDisabled: React.CSSProperties = {
  ...ghostBtn,
  opacity: 0.3,
  cursor: 'not-allowed',
};

const stopBtn: React.CSSProperties = {
  ...baseBtn,
  background: 'transparent',
  color: 'rgba(245,240,234,0.75)',
  borderColor: 'rgba(245,240,234,0.22)',
};

const hintStyle: React.CSSProperties = {
  color: 'rgba(245,240,234,0.45)',
  fontSize: 12.5,
  lineHeight: 1.5,
};
