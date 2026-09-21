import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { SettingsScreen } from '@/components/screens/settings/SettingsScreen';
import { mockSettingsProps, mockSubscription } from '@/components/screens/settings/mockSettings';

/**
 * Found by cross-referencing a production Settings screenshot against the DB
 * (2026-09-21): the owner's account had NO subscription row and NO voice
 * profile, yet Settings showed a "Voice Vault - Trial" card, a "Free trial"
 * line, and a Cancel row for a subscription that did not exist.
 *
 * Cause: the page rewrote `none` to `trial` before handing the screen its
 * props, because the screen's own status union had no `none` member. Every
 * beta tester passes through `none` between signing up and paying.
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

/** The plan card's row labels, ignoring the always-mounted cancel sheet. */
function rowLabels(container: HTMLElement): string[] {
  return [...container.querySelectorAll('.set__row-label')].map((e) => e.textContent?.trim() ?? '');
}

function renderNone(over = {}) {
  return render(
    <SettingsScreen
      {...mockSettingsProps()}
      subscription={mockSubscription('none')}
      {...over}
    />,
  );
}

describe('SettingsScreen — no vault yet (status: none)', () => {
  it('does NOT claim a free trial the user does not have', () => {
    renderNone();
    expect(screen.queryByText('Free trial')).toBeNull();
    expect(screen.queryByText(/Voice Vault . Trial/)).toBeNull();
    expect(screen.queryByText(/won.t be charged/i)).toBeNull();
  });

  it('does NOT offer to cancel a subscription that does not exist', () => {
    const { container } = renderNone();
    // Scope to the plan card's ROWS. The cancel sheet is always mounted in the
    // DOM (hidden by transform), so matching raw text would find it whatever
    // the plan state is - the question is whether the row that OPENS it exists.
    expect(rowLabels(container)).not.toContain('Cancel subscription');
  });

  it('says plainly that nothing is kept yet', () => {
    renderNone();
    expect(screen.getByText(/Nothing is kept here yet/i)).toBeTruthy();
  });

  it('keeps the empty-vault tense — future, never present', () => {
    renderNone();
    // "will live here", not "lives here" / "is kept here".
    expect(screen.getByText(/will live here/i)).toBeTruthy();
  });

  it('offers Keep my voice, routing to Card Capture', () => {
    const onKeepVoice = vi.fn();
    renderNone({ onKeepVoice });
    fireEvent.click(screen.getByText('Keep my voice'));
    expect(onKeepVoice).toHaveBeenCalledTimes(1);
  });

  it('omits the CTA rather than dead-ending when no handler is wired', () => {
    renderNone({ onKeepVoice: undefined });
    expect(screen.queryByText('Keep my voice')).toBeNull();
    // The honest statement still renders.
    expect(screen.getByText(/Nothing is kept here yet/i)).toBeTruthy();
  });

  it('still renders the trial card for a real trial', () => {
    const { container } = render(
      <SettingsScreen {...mockSettingsProps()} subscription={mockSubscription('trial')} />,
    );
    expect(screen.getByText(/Free trial/)).toBeTruthy();
    expect(rowLabels(container)).toContain('Cancel subscription');
  });
});
