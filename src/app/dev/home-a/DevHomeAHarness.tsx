'use client';

/**
 * Comparison harness for the two Home A design directions. Dev-only chrome —
 * the controls are deliberately plain so they never read as part of either
 * design under review.
 */

import { useState } from 'react';
import { HomeAScreenStrata } from '@/components/screens/home/HomeAScreen.strata';
import { HomeAScreenThreshold } from '@/components/screens/home/HomeAScreen.threshold';
import { TOTAL_PROMPT_COUNT } from '@/lib/voice-training/script';

type Direction = 'strata' | 'threshold' | 'both';

const noop = () => {};

export function DevHomeAHarness() {
  const [direction, setDirection] = useState<Direction>('both');
  const [clips, setClips] = useState(12);
  const [isProcessing, setProcessing] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  // Remount key: the arrival choreography only plays on mount, so replaying it
  // is the whole point of the harness.
  const [run, setRun] = useState(0);

  const shared = {
    isProcessing,
    clipsRecorded: clips,
    onContinue: noop,
    onSettings: noop,
    reducedMotionOverride: reducedMotion,
    footer: (
      <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>Sign out</span>
    ),
  };

  const showStrata = direction === 'strata' || direction === 'both';
  const showThreshold = direction === 'threshold' || direction === 'both';

  return (
    <div style={{ background: '#E7E4DF', minHeight: '100dvh' }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          alignItems: 'center',
          padding: '10px 14px',
          background: '#1C1A18',
          color: '#fff',
          fontFamily: 'ui-monospace, monospace',
          fontSize: 12,
        }}
      >
        <strong>/dev/home-a</strong>

        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          direction
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as Direction)}
          >
            <option value="both">both</option>
            <option value="strata">1 · strata</option>
            <option value="threshold">2 · threshold</option>
          </select>
        </label>

        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          clips {String(clips).padStart(2, '0')}/{TOTAL_PROMPT_COUNT}
          <input
            type="range"
            min={0}
            max={TOTAL_PROMPT_COUNT}
            value={clips}
            onChange={(e) => setClips(Number(e.target.value))}
            disabled={isProcessing}
          />
        </label>

        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={isProcessing}
            onChange={(e) => setProcessing(e.target.checked)}
          />
          isProcessing
        </label>

        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={reducedMotion}
            onChange={(e) => setReducedMotion(e.target.checked)}
          />
          reduced motion
        </label>

        <button type="button" onClick={() => setRun((r) => r + 1)}>
          replay arrival
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 24,
          justifyContent: 'center',
          padding: 24,
        }}
      >
        {showStrata && (
          <figure style={{ margin: 0 }}>
            <figcaption style={figcap}>1 · Strata</figcaption>
            <div style={frame}>
              <HomeAScreenStrata key={`st-${run}-${clips}-${isProcessing}-${reducedMotion}`} {...shared} />
            </div>
          </figure>
        )}

        {showThreshold && (
          <figure style={{ margin: 0 }}>
            <figcaption style={figcap}>2 · Threshold</figcaption>
            <div style={frame}>
              <HomeAScreenThreshold key={`th-${run}-${clips}-${isProcessing}-${reducedMotion}`} {...shared} />
            </div>
          </figure>
        )}
      </div>
    </div>
  );
}

const figcap: React.CSSProperties = {
  fontFamily: 'ui-monospace, monospace',
  fontSize: 12,
  color: '#4A4A4A',
  marginBottom: 8,
  textAlign: 'center',
};

/** 390px viewport — iPhone 14/15 logical width, the mobile sim the motion bar
 *  is judged against. */
const frame: React.CSSProperties = {
  width: 390,
  height: 800,
  overflow: 'auto',
  background: 'var(--color-bg-neutral)',
  borderRadius: 12,
  boxShadow: '0 6px 24px rgba(0,0,0,0.16)',
};
