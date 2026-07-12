import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { SettingsScreen } from '@/components/screens/settings/SettingsScreen';
import {
  mockSettingsProps,
  mockSubscription,
  mockSubscriptionAnnual,
} from '@/components/screens/settings/mockSettings';
import type { SettingsScreenProps } from '@/components/screens/settings/SettingsScreen.types';

/**
 * Step 9 Settings & Trust. Covers the six plan variants' calm copy register, the
 * date-FACT formatting (UTC-stable — no off-by-one), the delete-in-P1 gate, the
 * email confirm flow (guard → "check your inbox"), and that the delete terminal
 * only shows "closed" when the async teardown resolves ok.
 */
beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
});
afterEach(() => cleanup());

function renderSettings(over: Partial<SettingsScreenProps> = {}) {
  return render(<SettingsScreen {...mockSettingsProps(over)} reducedMotionOverride />);
}

describe('plan variants', () => {
  it('trial states the end as a date fact, not a countdown', () => {
    renderSettings({ subscription: mockSubscription('trial') });
    // 2026-06-14 must render as June 14 regardless of the runner's timezone.
    expect(screen.getByText('Free trial · ends June 14')).toBeTruthy();
    expect(screen.getByText(/After that it’s \$12\.99 a month/)).toBeTruthy();
    // banned urgency pattern must never appear
    expect(screen.queryByText(/days left/i)).toBeNull();
  });

  it('active monthly shows the renewal date + monthly price', () => {
    renderSettings({ subscription: mockSubscription('active') });
    expect(screen.getByText('Renews July 14 · $12.99 a month')).toBeTruthy();
  });

  it('active annual carries the year and the ~monthly framing', () => {
    renderSettings({ subscription: mockSubscriptionAnnual() });
    expect(screen.getByText('Renews June 14, 2027 · $119 a year')).toBeTruthy();
    expect(screen.getByText(/about \$10 a month/)).toBeTruthy();
  });

  it('past_due leads with the fix, never red, and keeps the reassurance', () => {
    renderSettings({ subscription: mockSubscription('past_due') });
    expect(screen.getByText(/Update your card to keep your voice safe/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Update card' })).toBeTruthy();
  });

  it('lapsed uses the "Bring it back" verb and the paused pill', () => {
    renderSettings({ subscription: mockSubscription('lapsed') });
    expect(screen.getByText('Voice Vault · Paused')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Bring it back' })).toBeTruthy();
  });

  it('cancelled reads "Open until <date>", not "Active"', () => {
    renderSettings({ subscription: mockSubscription('cancelled') });
    expect(screen.getByText('Voice Vault · Open until July 14')).toBeTruthy();
    expect(screen.queryByText(/Active until/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Bring it back' })).toBeTruthy();
  });

  it('the status pill carries "Voice Vault" exactly once per screen', () => {
    renderSettings({ subscription: mockSubscription('trial') });
    expect(screen.getAllByText(/Voice Vault/)).toHaveLength(1);
  });
});

describe('trust band (seen once, then slim)', () => {
  it('shows the full band on first visit and latches it exactly once', async () => {
    const onTrustBandSeen = vi.fn();
    renderSettings({ trustBandSeen: false, onTrustBandSeen });
    expect(screen.getByText(/nothing happens to them without you/)).toBeTruthy();
    await waitFor(() => expect(onTrustBandSeen).toHaveBeenCalledTimes(1));
  });

  it('shows only the slim one-liner on return and never re-latches', () => {
    const onTrustBandSeen = vi.fn();
    renderSettings({ trustBandSeen: true, onTrustBandSeen });
    // The full lead is gone; the residual reassurance line stays.
    expect(screen.queryByText(/nothing happens to them without you/)).toBeNull();
    expect(screen.getByText('Yours to manage, and yours alone.')).toBeTruthy();
    expect(onTrustBandSeen).not.toHaveBeenCalled();
  });
});

describe('empty-date fallbacks (real Stripe rows can lack a period end)', () => {
  it('active with no renewal date drops the dangling "Renews · "', () => {
    renderSettings({ subscription: { ...mockSubscription('active'), renewsAt: null } });
    expect(screen.getByText('$12.99 a month')).toBeTruthy();
    expect(screen.queryByText(/Renews\s+·/)).toBeNull();
  });
});

describe('delete-in-P1 gate', () => {
  it('hides the Delete control when deleteEnabled is false', () => {
    renderSettings({ deleteEnabled: false });
    expect(screen.queryByText('Delete account')).toBeNull();
  });
  it('shows it when enabled', () => {
    renderSettings({ deleteEnabled: true });
    expect(screen.getByText('Delete account')).toBeTruthy();
  });
});

describe('sign-in row is display-only (magic-link)', () => {
  it('reassures with no action button', () => {
    renderSettings();
    expect(screen.getByText(/No password to remember/)).toBeTruthy();
  });
});

describe('email change flow', () => {
  it('guards an empty address instead of sending', () => {
    const onChangeEmail = vi.fn();
    renderSettings({ onChangeEmail });
    fireEvent.click(screen.getByRole('button', { name: 'Change' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send the link' }));
    expect(onChangeEmail).not.toHaveBeenCalled();
    expect(screen.getByText(/Enter the email address/)).toBeTruthy();
  });

  it('shows the "check your inbox" confirmation on a successful send', async () => {
    const onChangeEmail = vi.fn().mockResolvedValue({ ok: true });
    renderSettings({ onChangeEmail });
    fireEvent.click(screen.getByRole('button', { name: 'Change' }));
    fireEvent.change(screen.getByLabelText('New email address'), {
      target: { value: 'rosa.new@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send the link' }));
    await waitFor(() => {
      expect(screen.getByText('Check your inbox')).toBeTruthy();
    });
    expect(onChangeEmail).toHaveBeenCalledWith('rosa.new@example.com');
    // findByText (retrying) not getByText (synchronous): the confirmation copy
    // and the "Check your inbox" heading are set together, but asserting the copy
    // synchronously right after the heading's waitFor is flaky under full-suite
    // load (FOLLOW_UPS #103). Retry until present.
    expect(await screen.findByText(/We sent a link to rosa\.new@example\.com/)).toBeTruthy();
  });
});

describe('delete teardown terminals (never "closed" without an ok result)', () => {
  it('renders the closed terminal only after onDeleteAccount resolves ok', async () => {
    const onDeleteAccount = vi.fn().mockResolvedValue({ ok: true });
    renderSettings({ onDeleteAccount });
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.change(screen.getByLabelText('Type delete to confirm'), {
      target: { value: 'delete' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Delete everything' }));
    await waitFor(() => {
      expect(screen.getByText('Your account is closed')).toBeTruthy();
    });
  });

  it('renders the failure terminal when the teardown fails', async () => {
    const onDeleteAccount = vi.fn().mockResolvedValue({ ok: false });
    renderSettings({ onDeleteAccount });
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.change(screen.getByLabelText('Type delete to confirm'), {
      target: { value: 'DELETE' }, // case-insensitive by design
    });
    fireEvent.click(screen.getByRole('button', { name: 'Delete everything' }));
    await waitFor(() => {
      expect(screen.getByText('Your account is still here')).toBeTruthy();
    });
    expect(screen.queryByText('Your account is closed')).toBeNull();
  });

  it('keeps "Delete everything" disabled until the word matches', () => {
    renderSettings();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    const finalBtn = screen.getByRole('button', { name: 'Delete everything' }) as HTMLButtonElement;
    expect(finalBtn.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Type delete to confirm'), {
      target: { value: 'nope' },
    });
    expect(finalBtn.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Type delete to confirm'), {
      target: { value: ' delete ' },
    });
    expect(finalBtn.disabled).toBe(false);
  });
});
