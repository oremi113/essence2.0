'use client';

import { useCallback, useState } from 'react';
import {
  FirstPlaybackScreen,
  type AmplitudeSource,
} from '@/components/screens/first-playback/FirstPlaybackScreen';
import { CANONICAL_LINE } from '@/components/screens/first-playback/FirstPlaybackScreen.cadence';

/**
 * Dev harness for Step 5 · First Playback.
 *
 * Mirrors the control panel in `prototypes/essence-step5-first-playback.html`:
 * the happy path, reduced motion, and the three candidate lines. Switching a
 * line remounts the screen, so each run starts from a clean sequence.
 *
 * The three lines are the point, not a convenience. The prototype's hard gate
 * is that the layout must not belong to one sentence — all three have to settle
 * inside the reserved block, with the fit step stepping the size down where a
 * line needs it. This harness is how that stays true.
 *
 * No audio is played. The prototype refuses a synthetic voice ("a fake voice
 * would mislead the review"), so the choreography is driven by the line's own
 * measured cadence. Production swaps in an AnalyserNode and every timing holds.
 */

const LINES = [
  { label: 'A · measured', short: 'A', line: CANONICAL_LINE },
  { label: 'B', short: 'B', line: 'Whatever happens, this much of me stays.' },
  { label: 'C', short: 'C', line: "I'm still here, in the way I could manage." },
] as const;

/**
 * Height of the control bar, fed to the screen as --app-main-inset-bottom.
 *
 * The screen's own content floor is 796px at 390px wide (82 top + 246 stage +
 * 368 bottom + 100 padding) — the same 796 of 844 the prototype reports. Keep
 * this bar small enough that 100dvh minus it clears 796, or the harness clips
 * the screen's bottom padding.
 */
const BAR_HEIGHT = 44;

const AMPLITUDE: AmplitudeSource = { kind: 'cadence' };

export function DevFirstPlaybackHarness() {
  const [lineIndex, setLineIndex] = useState(0);
  const [reduced, setReduced] = useState(false);
  // Bumping the key remounts the screen, which is how a run is restarted.
  const [runId, setRunId] = useState(0);

  const rerun = useCallback(() => setRunId((n) => n + 1), []);

  const selectLine = useCallback((i: number) => {
    setLineIndex(i);
    setRunId((n) => n + 1);
  }, []);

  const toggleReduced = useCallback((next: boolean) => {
    setReduced(next);
    setRunId((n) => n + 1);
  }, []);

  return (
    /*
     * The harness must not introduce a scrollbar. The ceremonial line is sized
     * in CONTAINER units, so 15px of scrollbar silently narrows the container
     * and the line renders ~1.6px smaller than production — /dev would then lie
     * about the one number this screen fought hardest over.
     *
     * So: the page never scrolls, the control bar sits BELOW the screen, and
     * `--app-main-inset-bottom` tells the screen how much of the viewport it
     * doesn't own — the same mechanism the real app shell uses. The screen ends
     * up shorter than the viewport, exactly as it does under the shell, and the
     * container width stays honest.
     */
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        overflow: 'hidden',
        ['--app-main-inset-bottom' as string]: `${BAR_HEIGHT}px`,
      }}
    >
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <FirstPlaybackScreen
          key={`${lineIndex}-${reduced}-${runId}`}
          line={LINES[lineIndex].line}
          ledeLines={['Twenty-five moments.', 'This is what they became.']}
          payoff="That's you."
          aside="It kept the pauses."
          amplitude={AMPLITUDE}
          forceReducedMotion={reduced}
          onCreateFirstMessage={() => {
             
            console.log('[dev] onCreateFirstMessage');
          }}
          onPlaybackComplete={() => {
             
            console.log('[dev] onPlaybackComplete');
          }}
          onReplay={() => {
             
            console.log('[dev] onReplay');
          }}
        />
      </div>

      <div
        style={{
          flex: 'none',
          height: BAR_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
          padding: '0 12px',
          background: 'var(--color-surface-card)',
          fontFamily: 'var(--font-body)',
          fontSize: 13,
          overflowX: 'auto',
        }}
      >
        <Toggle on={!reduced} onClick={() => toggleReduced(false)}>
          Happy
        </Toggle>
        <Toggle on={reduced} onClick={() => toggleReduced(true)}>
          Reduced
        </Toggle>
        {LINES.map((l, i) => (
          <Toggle key={l.label} on={i === lineIndex} onClick={() => selectLine(i)}>
            {l.short}
          </Toggle>
        ))}
        <Toggle on={false} onClick={rerun}>
          Replay
        </Toggle>
      </div>
    </div>
  );
}

function Toggle({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontFamily: 'var(--font-body)',
        fontSize: 13,
        fontWeight: 600,
        minHeight: 38,
        padding: '0 14px',
        borderRadius: 8,
        border: `1px solid ${on ? 'var(--color-mineral)' : 'rgba(0,0,0,.08)'}`,
        background: on ? 'var(--color-mineral)' : '#fff',
        color: on ? '#fff' : 'var(--color-text-primary)',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}
