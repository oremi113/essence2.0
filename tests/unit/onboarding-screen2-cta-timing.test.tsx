import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { Screen2 } from '@/components/screens/onboarding/Screen2';
import { ONBOARDING_TIMING } from '@/lib/config/onboarding-timing';

/**
 * Pins WHEN Continue becomes available on onboarding screen 2.
 *
 * This number has been wrong, then ambiguous, twice. It was once measured from
 * the conveyor's tail plus a further 3s, which made the phrase count a gate on
 * advancing: twelve phrases held the button for ~25s on screen 2 of 12, while
 * anyone with reduced motion on (who sees no conveyor at all) got it instantly.
 *
 * It is now measured from the LAST TRANSIENT PHRASE, so the conclusion plays to
 * someone already free to leave. Asserting the delay directly means the next
 * person to tune the phrase list finds out here, not on a device.
 */
vi.mock('@/components/breath-stone', () => ({ BreathStone: () => null }));

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: false, media: q, onchange: null,
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
});
afterEach(() => cleanup());

function delays(container: HTMLElement) {
  const cta = container.querySelector('.onboarding-ctas--delayed') as HTMLElement | null;
  const tail = container.querySelector('.onboarding-conveyor-tail') as HTMLElement | null;
  const final = container.querySelector('.onboarding-conveyor__phrase--final') as HTMLElement | null;
  const ms = (el: HTMLElement | null) => (el ? parseInt(el.style.animationDelay || '0', 10) : null);
  return { cta: ms(cta), tail: ms(tail), conclusion: ms(final) };
}

describe('Screen 2 — when Continue arrives', () => {
  it('lands with the last transient phrase, not after the conclusion', () => {
    const { container } = render(<Screen2 onNext={vi.fn()} />);
    const { cta, conclusion, tail } = delays(container);

    const phrases = container.querySelectorAll('.onboarding-conveyor__phrase:not(.onboarding-conveyor__phrase--final)');
    const expected =
      ONBOARDING_TIMING.CONVEYOR_INTRO_DELAY_MS +
      phrases.length * ONBOARDING_TIMING.CONVEYOR_PHRASE_DURATION_MS +
      ONBOARDING_TIMING.CONVEYOR_CTA_BEAT_MS;

    expect(cta).toBe(expected);
    // The whole conclusion plays AFTER the button is already available.
    expect(cta!).toBeLessThan(conclusion!);
    expect(cta!).toBeLessThan(tail!);
  });

  it('keeps the hold short enough to not be a toll', () => {
    const { container } = render(<Screen2 onNext={vi.fn()} />);
    const { cta } = delays(container);
    // Screen 2 of 12. Anything approaching the old ~25s is a regression.
    expect(cta!).toBeLessThanOrEqual(8000);
  });

  it('derives from the phrase count, so trimming the list shortens the hold', () => {
    const { container } = render(<Screen2 onNext={vi.fn()} />);
    const phrases = container.querySelectorAll('.onboarding-conveyor__phrase:not(.onboarding-conveyor__phrase--final)');
    // Four, per the 2026-09-21 owner call. If this changes, the CTA moves with
    // it — which is the intended coupling, and why the number is asserted.
    expect(phrases.length).toBe(4);
  });
});
