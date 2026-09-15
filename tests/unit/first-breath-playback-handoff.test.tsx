import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

/**
 * The `detail → playback` handoff must hand over the stone's SPHERE, not the
 * canvas element that contains it.
 *
 * This is a regression guard for a defect that shipped and survived review for
 * a long time precisely because it is invisible in the source: the ceremony's
 * canvas is 200px and `FirstPlaybackScreen`'s stone wrapper is sized against
 * it, so both sides read "200" and looked like a match. But the engine draws
 * the sphere at 0.28 of the canvas's shorter side, so a 200px canvas holds a
 * 112px sphere inside 44px of transparent margin per side — margin that exists
 * to give the bloom (3.5x radius) and haze (2x) somewhere to fall off.
 *
 * Handing over the element's rect therefore scaled the incoming stone by
 * 200/112 = 1.79x, and the hero object jumped 108px → 195px in the single
 * frame of the cut, at the ceremony's most ceremonial moment. Only measuring
 * pixels across the swap frame found it.
 *
 * See docs/follow-ups/2026-09-15-the-match-cut-scales-the-canvas-box-not-the-stone.md
 */

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/lib/analytics/client', () => ({ track: vi.fn() }));
vi.mock('@/lib/analytics/journey', () => ({
  trackJourney: vi.fn(),
  JOURNEY_EVENTS: new Proxy({}, { get: (_t, k) => String(k) }),
}));
vi.mock('@/lib/audio/firstBreathAudio', () => ({ createFirstBreathAudio: () => null }));
// Reduced motion collapses the timeline: the reveal flags are immediately true,
// so `See My Stone` and then `Continue` are reachable without fake timers.
vi.mock('@/lib/animation/useReducedMotion', () => ({ useReducedMotion: () => true }));

// Keep the REAL ratio constants — they are what is under test. Only the canvas
// component is stubbed, since <canvas> does not render under jsdom.
vi.mock('@/components/breath-stone', async (importActual) => ({
  ...(await importActual<typeof import('@/components/breath-stone')>()),
  BreathStone: () => null,
}));

// Capture what the ceremony hands to the incoming screen.
const entranceFromSpy = vi.fn();
vi.mock('@/components/screens/first-playback/FirstPlaybackScreen', () => ({
  FirstPlaybackScreen: (props: { entranceFrom?: unknown }) => {
    entranceFromSpy(props.entranceFrom);
    return null;
  },
}));

import { FirstBreathSequence } from '@/components/screens/FirstBreathSequence';
import {
  SPHERE_RADIUS_RATIO,
  SPHERE_DIAMETER_RATIO,
} from '@/components/breath-stone';

/** The ceremony's `detail` stone, as configured in FirstBreathSequence. */
const CANVAS_PX = 200;
/** Where the canvas sits on screen. Arbitrary, but off-origin on both axes so
 *  a centre-preservation bug cannot pass by coincidence. */
const CANVAS_RECT = { left: 95, top: 133.8, width: CANVAS_PX, height: CANVAS_PX };

/**
 * jsdom reports every rect as zero, so the ceremony would measure a 0x0 stone
 * and hand over nothing. Stub the geometry for the element the handoff reads.
 */
function stubStoneRect() {
  return vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    ...CANVAS_RECT,
    right: CANVAS_RECT.left + CANVAS_RECT.width,
    bottom: CANVAS_RECT.top + CANVAS_RECT.height,
    x: CANVAS_RECT.left,
    y: CANVAS_RECT.top,
    toJSON: () => ({}),
  } as DOMRect);
}

function walkToPlayback() {
  render(<FirstBreathSequence voiceProfileId="vp1" />);
  fireEvent.click(screen.getByRole('button', { name: 'See My Stone' }));
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  return entranceFromSpy.mock.calls.at(-1)?.[0] as
    | { left: number; top: number; width: number }
    | undefined;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  entranceFromSpy.mockClear();
});

describe('detail → playback handoff hands over the sphere, not the canvas box', () => {
  it('passes the sphere width, not the canvas element width', () => {
    stubStoneRect();
    const handoff = walkToPlayback();

    expect(handoff).toBeTruthy();
    expect(handoff!.width).toBeCloseTo(CANVAS_PX * SPHERE_DIAMETER_RATIO, 5);
    // The defect, pinned explicitly: handing over the element's own width
    // scaled the incoming stone ~1.79x and popped the hero object mid-cut.
    expect(handoff!.width).not.toBeCloseTo(CANVAS_RECT.width, 5);
  });

  it('keeps the stone concentric — the sphere is inset, not repositioned', () => {
    stubStoneRect();
    const handoff = walkToPlayback();

    const canvasCentreX = CANVAS_RECT.left + CANVAS_RECT.width / 2;
    const canvasCentreY = CANVAS_RECT.top + CANVAS_RECT.height / 2;
    expect(handoff!.left + handoff!.width / 2).toBeCloseTo(canvasCentreX, 5);
    // Square canvas, so the same ratio insets the vertical axis too. A rect
    // handed over with the width corrected but the origin left alone would
    // pass the width assertion above and still land the stone off-centre.
    expect(handoff!.top + handoff!.width / 2).toBeCloseTo(canvasCentreY, 5);
  });

  it('the exported ratio still matches what the engine actually draws', () => {
    // `breathStoneEngine` draws at `Math.min(W, H) * SPHERE_RADIUS_RATIO`. If
    // that ever changes, this fails and both it and the handoff move together
    // — which is the whole point of exporting the constant rather than letting
    // callers hardcode a number they cannot see.
    expect(SPHERE_RADIUS_RATIO).toBe(0.28);
    expect(SPHERE_DIAMETER_RATIO).toBe(SPHERE_RADIUS_RATIO * 2);
    // toBeCloseTo, not toBe: 200 * 0.56 is 112.00000000000001 in binary floating
    // point. Sub-nanopixel, but an exact comparison would fail on it.
    expect(CANVAS_PX * SPHERE_DIAMETER_RATIO).toBeCloseTo(112, 9);
  });
});
