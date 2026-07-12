'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { track } from '@/lib/analytics/client';
import {
  useSequenceTimeline,
  type SequencePhase,
} from '@/lib/animation/useSequenceTimeline';

export type FirstBreathPhase = 'forming' | 'crystallize' | 'preserved' | 'detail';

// Sub-phases inside preserved let the timeline drive the revealTone beat
// (lands on bloom + ring peak) and the text/CTA reveal without sibling
// setTimeouts. Visually all three map to the 'preserved' phase above.
type TimelinePhase = 'forming' | 'crystallize' | 'preserved' | 'revealTone' | 'revealed';

// North-star beat timings. Forming runs a full 5s (particles rise, halo
// pulses, copy settles in). Crystallize runs 2.5s (fragments converge,
// caption fades in late). Reveal begins at 7.5s.
export const CRYSTALLIZE_AT_MS = 5000;
export const PRESERVED_AT_MS = 7500;
export const SKIP_VISIBLE_AT_MS = 1000;

// Preserved entrance choreography. The stone blooms over 2.5s; bloom
// overlay peaks at 1250ms (50% of entrance). Gold ring delay is tuned so
// its own 12%-peak lands on the SAME frame as the bloom peak — delay
// (1000ms) + 12% of 2200ms (264ms) ≈ 1264ms. Cause-and-effect, not two
// unrelated pulses near each other. Text + CTA fade in only after the
// bloom has settled, so the stone owns its entrance.
export const STONE_ENTRANCE_MS = 2500;
export const RING_FIRE_AT_MS = 1000;
export const RING_DISSIPATE_MS = 2200;
export const TEXT_REVEAL_DELAY_MS = 1800;

// Detail CTA hangs back until the chip cascade settles. Chips stagger
// 0ms / 120ms / 240ms with a 600ms fade each, so the last chip lands at
// ~840ms. 1200ms gives a ~360ms breath before Continue appears — user
// experiences what they just earned before being offered the next step.
export const DETAIL_CTA_DELAY_MS = 1200;

export interface UseFirstBreathPhasesOptions {
  voiceProfileId: string;
  prefersReducedMotion: boolean;
  /**
   * Fired as the crystallize beat begins (t = CRYSTALLIZE_AT_MS). The consumer
   * owns the audio engine, so the audio one-shots are surfaced as callbacks
   * here rather than reaching into refs from inside the timeline. Never fires
   * under reduced motion (the timeline is paused, so onEnter doesn't run).
   */
  onCrystallizeBeat?: () => void;
  /**
   * Fired as the reveal tone beat begins (t = PRESERVED_AT_MS + RING_FIRE_AT_MS),
   * landing the bell on the stone's bloom + gold-ring peak.
   */
  onRevealBeat?: () => void;
}

export interface UseFirstBreathPhasesResult {
  phase: FirstBreathPhase;
  skipVisible: boolean;
  ctaVisible: boolean;
  detailRevealed: boolean;
  preservedRevealed: boolean;
  /** True once the stone's entrance bloom has settled and copy/CTA can show. */
  preservedReady: boolean;
  /** True while the bloom animation is active — drives sibling entrance visuals. */
  entranceActive: boolean;
  skipToPreserved: () => void;
  goToDetail: () => void;
}

/**
 * Owns the First Breath sequence's phase state machine:
 *   forming → crystallize → preserved → (detail via user tap)
 *
 * The preserved → revealed fine-grained transition is driven by an
 * internal TimelinePhase enum (preserved → revealTone → revealed) so the
 * bloom peak, ring pulse, and text/CTA reveal land on the same frame
 * without sibling setTimeouts. Consumers only see the four top-level
 * phases via `phase`.
 *
 * Honors prefers-reduced-motion by pausing the timeline and jumping
 * straight to the preserved-ready state. Reveal flags (skipVisible,
 * ctaVisible, detailRevealed) are all immediately true in that mode.
 *
 * Fires analytics events at the sequence boundaries:
 *   - breath_stone_sequence_started  (on mount)
 *   - breath_stone_sequence_completed (on enter 'revealed')
 *   - breath_stone_skip_tapped       (on skipToPreserved)
 *   - breath_stone_cta_tapped        (on goToDetail and on the detail-phase exit from the consumer)
 */
export function useFirstBreathPhases({
  voiceProfileId,
  prefersReducedMotion,
  onCrystallizeBeat,
  onRevealBeat,
}: UseFirstBreathPhasesOptions): UseFirstBreathPhasesResult {
  const [userPhase, setUserPhase] = useState<FirstBreathPhase | null>(null);
  const [skipRevealed, setSkipRevealed] = useState<boolean>(false);
  const [detailRevealed, setDetailRevealed] = useState<boolean>(false);

  // Beat callbacks live in refs so the timeline's onEnter closures always call
  // the latest handler without adding them to the useMemo deps below — a new
  // callback identity each render must not rebuild (and thereby restart) the
  // timeline.
  const onCrystallizeBeatRef = useRef(onCrystallizeBeat);
  onCrystallizeBeatRef.current = onCrystallizeBeat;
  const onRevealBeatRef = useRef(onRevealBeat);
  onRevealBeatRef.current = onRevealBeat;

  const timelinePhases = useMemo<SequencePhase<TimelinePhase>[]>(
    () => [
      { key: 'forming', duration: CRYSTALLIZE_AT_MS },
      {
        key: 'crystallize',
        duration: PRESERVED_AT_MS - CRYSTALLIZE_AT_MS,
        onEnter: () => {
          // Crystallize harmonic swell — see firstBreathAudio.ts. Consumer owns
          // the engine; we fire the beat via a ref so the timeline never restarts.
          onCrystallizeBeatRef.current?.();
        },
      },
      { key: 'preserved', duration: RING_FIRE_AT_MS },
      {
        key: 'revealTone',
        duration: TEXT_REVEAL_DELAY_MS - RING_FIRE_AT_MS,
        onEnter: () => {
          // Low resonant bell — lands on the bloom + gold-ring peak.
          onRevealBeatRef.current?.();
        },
      },
      {
        key: 'revealed',
        duration: 0,
        onEnter: () => {
          track('breath_stone_sequence_completed', { voiceProfileId });
        },
      },
    ],
    [voiceProfileId]
  );

  const { currentPhase: timelinePhase, skipTo: timelineSkipTo } =
    useSequenceTimeline(timelinePhases, {
      paused: prefersReducedMotion,
    });

  const autoVisualPhase: FirstBreathPhase =
    timelinePhase === 'forming' || timelinePhase === 'crystallize'
      ? timelinePhase
      : 'preserved';

  const phase: FirstBreathPhase =
    userPhase ?? (prefersReducedMotion ? 'preserved' : autoVisualPhase);
  const preservedRevealed = timelinePhase === 'revealed';
  const ctaRevealed = preservedRevealed;
  const ctaVisible = ctaRevealed || prefersReducedMotion || phase !== 'forming';
  const skipVisible = skipRevealed || prefersReducedMotion;
  // During the preserved entrance (2.5s bloom + ring), copy and CTA stay
  // hidden so the stone owns the reveal. They fade in after TEXT_REVEAL_DELAY_MS.
  const preservedReady =
    phase !== 'preserved' || preservedRevealed || prefersReducedMotion;
  const entranceActive = phase === 'preserved' && !prefersReducedMotion;

  // Fire-and-forget funnel start. Effect scope (not render scope) so React's
  // Strict Mode double-render in dev doesn't double-emit.
  useEffect(() => {
    track('breath_stone_sequence_started', {
      voiceProfileId,
      reducedMotion: prefersReducedMotion,
    });
    // Intentionally empty deps — sequence_started is a single mount event.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Skip affordance fades in shortly after mount, independent of the main
  // beat progression so it's available during both forming and crystallize.
  useEffect(() => {
    if (prefersReducedMotion) return;
    const t = setTimeout(() => setSkipRevealed(true), SKIP_VISIBLE_AT_MS);
    return () => clearTimeout(t);
  }, [prefersReducedMotion]);

  // Detail CTA holds back until the chip cascade has settled. Reset on
  // exit so a re-entry (restart flows in future) fires the delay again.
  useEffect(() => {
    if (phase !== 'detail') {
      setDetailRevealed(false);
      return;
    }
    if (prefersReducedMotion) {
      setDetailRevealed(true);
      return;
    }
    const t = setTimeout(() => setDetailRevealed(true), DETAIL_CTA_DELAY_MS);
    return () => clearTimeout(t);
  }, [phase, prefersReducedMotion]);

  const skipToPreserved = useCallback(() => {
    track('breath_stone_skip_tapped', { voiceProfileId });
    // Delay reveal even on skip so the user still gets the stone's entrance.
    // The timeline auto-advances preserved → revealTone → revealed over
    // TEXT_REVEAL_DELAY_MS, which flips the reveal flags and fires the
    // completed event.
    timelineSkipTo('preserved');
  }, [voiceProfileId, timelineSkipTo]);

  const goToDetail = useCallback(() => {
    track('breath_stone_cta_tapped', { voiceProfileId, phase: 'preserved' });
    setUserPhase('detail');
  }, [voiceProfileId]);

  return {
    phase,
    skipVisible,
    ctaVisible,
    detailRevealed,
    preservedRevealed,
    preservedReady,
    entranceActive,
    skipToPreserved,
    goToDetail,
  };
}
