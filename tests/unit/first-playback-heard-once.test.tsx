import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';

/**
 * `onPlaybackComplete` is the funnel landmark `journey.first_playback_heard` —
 * the first evidence MASTER_SPEC's Immutable Journey Rule 4 ("first playback
 * must occur before first message creation") is actually satisfied, rather than
 * merely asserted.
 *
 * It has to mean one thing: *this user listened to their own voice, once*.
 *
 * Two paths reach the end of the utterance without being that, and both fired
 * before this guard existed:
 *
 *   1. **Replay.** "Hear it again" re-runs the whole utterance, so the landmark
 *      fired a second time for the same user. `docs/analytics/2026-09-10-first-
 *      playback-heard.md` expects this event's volume to track
 *      `voice_profile_ready` roughly 1:1 — double-counting reads as extra users.
 *   2. **Leaving mid-line.** Backgrounding the app calls `settle()`, which
 *      fast-forwards the screen so returning isn't mid-animation. That is the
 *      user NOT hearing it — the exact case the event exists to exclude, and
 *      the case FirstBreathSequence's own comment claims is excluded.
 *
 * Neither is visible in the source: all three routes bottom out in the same
 * `endSpeech()`, which looked like one completion path.
 */

vi.mock('@/lib/analytics/client', () => ({ track: vi.fn() }));
// Reduced motion collapses the utterance onto a deterministic timer chain, so
// the whole sequence can be driven with fake timers instead of an rAF loop.
vi.mock('@/lib/animation/useReducedMotion', () => ({ useReducedMotion: () => true }));
vi.mock('@/components/breath-stone', async (importActual) => ({
  ...(await importActual<typeof import('@/components/breath-stone')>()),
  BreathStone: () => null,
}));

import { FirstPlaybackScreen } from '@/components/screens/first-playback/FirstPlaybackScreen';
import { CANONICAL_LINE } from '@/components/screens/first-playback/FirstPlaybackScreen.cadence';

/** Long enough to clear the utterance, its tail reveals, and the decay. */
const PAST_THE_END_MS = 30_000;

/**
 * A moment that is genuinely *inside* the spoken line. Under reduced motion the
 * utterance starts at `REDUCED.playAtMs` (900ms) and the canonical line runs
 * ~3.6s, so 2000ms is mid-sentence.
 *
 * This is load-bearing: `settle()` is guarded by `runningRef`, so backgrounding
 * before the line starts is a different case entirely (nothing to abandon) and
 * asserting from there would pass without exercising the guard at all.
 */
const MID_UTTERANCE_MS = 2_000;

function renderScreen() {
  const onPlaybackComplete = vi.fn();
  render(
    <FirstPlaybackScreen
      line={CANONICAL_LINE}
      ledeLines={['Twenty-five moments.', 'This is what they became.']}
      payoff="That's you."
      aside="It kept the pauses."
      amplitude={{ kind: 'cadence' }}
      onCreateFirstMessage={vi.fn()}
      onPlaybackComplete={onPlaybackComplete}
    />
  );
  return onPlaybackComplete;
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

/** Background the tab, the way a real user leaving mid-line does. */
function backgroundTab() {
  const spy = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
  return spy;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('first_playback_heard fires exactly once, for a real listen', () => {
  it('fires once when the line plays through', () => {
    const onPlaybackComplete = renderScreen();

    expect(onPlaybackComplete).not.toHaveBeenCalled(); // not on arrival

    advance(PAST_THE_END_MS);

    expect(onPlaybackComplete).toHaveBeenCalledTimes(1);
  });

  it('does not fire again when the user asks to hear it again', () => {
    const onPlaybackComplete = renderScreen();
    advance(PAST_THE_END_MS);
    expect(onPlaybackComplete).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /hear it again/i }));
    advance(PAST_THE_END_MS);

    // The replay really did run — this is not passing because the click was a
    // no-op. The guard is on the landmark, not on the ceremony.
    expect(onPlaybackComplete).toHaveBeenCalledTimes(1);
  });

  it('does not fire when the user leaves mid-line', () => {
    const onPlaybackComplete = renderScreen();

    advance(MID_UTTERANCE_MS);
    expect(onPlaybackComplete).not.toHaveBeenCalled();

    backgroundTab();
    advance(PAST_THE_END_MS);

    expect(onPlaybackComplete).not.toHaveBeenCalled();
  });

  it('still settles the screen when the user leaves, it just does not count it', () => {
    const onPlaybackComplete = renderScreen();
    advance(MID_UTTERANCE_MS);

    // Reveals are CSS state, not conditional rendering — the element is always
    // in the DOM and `data-show` is what makes it visible.
    const payoff = () => document.querySelector('.fpb__payoff');

    // It has NOT arrived on its own yet, so its reveal after backgrounding is
    // settle()'s doing rather than the timeline simply having caught up.
    expect(payoff()?.getAttribute('data-show')).toBeNull();

    backgroundTab();

    // settle() fast-forwards the reveals so returning is not mid-animation.
    expect(payoff()?.getAttribute('data-show')).toBe('true');
    expect(onPlaybackComplete).not.toHaveBeenCalled();
  });
});
