import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

/**
 * S10-C — the First Breath ceremony must survive any audio failure and render
 * identically (silent graceful degradation). These tests exercise the SCREEN's
 * resilience (the defensive wrapping around create/start), not just the engine's
 * null-return — the actual user-facing guarantee.
 */

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/lib/analytics/client', () => ({ track: vi.fn() }));
// BreathStone renders to <canvas> — unrenderable/no-op under jsdom.
vi.mock('@/components/breath-stone', () => ({ BreathStone: () => null }));
// Force motion ON so the audio effect actually runs (it early-returns under
// reduced motion, which would skip the very paths under test).
vi.mock('@/lib/animation/useReducedMotion', () => ({ useReducedMotion: () => false }));
vi.mock('@/lib/audio/firstBreathAudio', () => ({ createFirstBreathAudio: vi.fn() }));

import { createFirstBreathAudio } from '@/lib/audio/firstBreathAudio';
import { FirstBreathSequence } from '@/components/screens/FirstBreathSequence';

const mockCreate = vi.mocked(createFirstBreathAudio);
const FORMING_COPY = 'Your first Breath Stone is forming.';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('FirstBreathSequence — audio failure never breaks the ceremony (S10-C)', () => {
  it('renders the ceremony when audio is unavailable (engine is null)', () => {
    mockCreate.mockReturnValue(null);
    expect(() => render(<FirstBreathSequence voiceProfileId="vp1" />)).not.toThrow();
    expect(screen.getByText(FORMING_COPY)).toBeTruthy();
  });

  it('renders the ceremony when createFirstBreathAudio() THROWS', () => {
    // The mount effect's guard must swallow this — a throw here previously could
    // propagate out of the effect and break the sacred beat.
    mockCreate.mockImplementation(() => {
      throw new DOMException('AudioContext limit reached', 'NotSupportedError');
    });
    expect(() => render(<FirstBreathSequence voiceProfileId="vp1" />)).not.toThrow();
    expect(screen.getByText(FORMING_COPY)).toBeTruthy();
  });

  it('renders — and disposes the half-built engine — when start() throws', () => {
    const dispose = vi.fn();
    mockCreate.mockReturnValue({
      start: () => {
        throw new Error('resume rejected');
      },
      playCrystallize: vi.fn(),
      playReveal: vi.fn(),
      dispose,
    });
    expect(() => render(<FirstBreathSequence voiceProfileId="vp1" />)).not.toThrow();
    expect(screen.getByText(FORMING_COPY)).toBeTruthy();
    // The engine was created but start() failed → it must be disposed so the
    // AudioContext isn't leaked.
    expect(dispose).toHaveBeenCalled();
  });

  it('renders normally when audio works (regression: the guards do not suppress a healthy engine)', () => {
    const engine = {
      start: vi.fn(),
      playCrystallize: vi.fn(),
      playReveal: vi.fn(),
      dispose: vi.fn(),
    };
    mockCreate.mockReturnValue(engine);
    expect(() => render(<FirstBreathSequence voiceProfileId="vp1" />)).not.toThrow();
    expect(screen.getByText(FORMING_COPY)).toBeTruthy();
    expect(engine.start).toHaveBeenCalledOnce();
    expect(engine.dispose).not.toHaveBeenCalled(); // healthy engine stays alive
  });
});
