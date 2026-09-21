import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

/**
 * Unit tests for RestoreActions — the vault-restore CTA that hands a paused
 * subscriber off to Stripe.
 *
 * The load-bearing case is FU-87: the `update_card` (past_due) branch must reach
 * the Customer Portal with a top-level navigation, NOT a post-`await`
 * `window.open('_blank')`. iOS/Safari block a `window.open` that runs after an
 * `await` as non-user-initiated, and the old code discarded the blocked handle
 * without setting `restoreFailed` — a silent dead-end on the money-recovery path.
 * These tests pin the navigation and forbid the popup so the regression can't
 * return.
 */

import { RestoreActions } from '@/app/app/vault/restore/actions';

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: vi.fn(async () => body) } as unknown as Response;
}

let hrefValue: string;
let openSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  hrefValue = '';
  openSpy = vi.fn();
  // jsdom's window.location is not writable and warns on navigation; replace it
  // with a plain object whose `href` setter records the assignment so we can
  // assert the full-page handoff without a real navigation.
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      get href() {
        return hrefValue;
      },
      set href(v: string) {
        hrefValue = v;
      },
    },
  });
  vi.stubGlobal('open', openSpy);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('RestoreActions — update_card (past_due)', () => {
  it('hands off to the Customer Portal with a top-level navigation, not a popup', async () => {
    const portalUrl = 'https://billing.stripe.com/p/session_abc';
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ portalUrl })));

    render(<RestoreActions hasRecordings mode="update_card" plan="monthly" />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    expect(hrefValue).toBe(portalUrl);
    // The regression guard: no gesture-detached window.open('_blank').
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('surfaces the failure terminal (never a silent dead-end) when the portal call fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: 'boom' }, false, 500)));

    render(<RestoreActions hasRecordings mode="update_card" plan="monthly" />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(hrefValue).toBe('');
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('follows a { redirect } (e.g. auth expired) to the current tab', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ redirect: '/auth/sign-in?next=/app/vault/restore' }, false, 401)),
    );

    render(<RestoreActions hasRecordings mode="update_card" plan="monthly" />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    expect(hrefValue).toBe('/auth/sign-in?next=/app/vault/restore');
    expect(openSpy).not.toHaveBeenCalled();
  });
});

describe('RestoreActions — restart (lapsed/cancelled)', () => {
  it('hands off to Checkout with the preserved plan via a top-level navigation', async () => {
    const checkoutUrl = 'https://checkout.stripe.com/c/pay/xyz';
    const fetchMock = vi.fn(async () => jsonResponse({ checkoutUrl }));
    vi.stubGlobal('fetch', fetchMock);

    render(<RestoreActions hasRecordings mode="restart" plan="annual" />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    expect(hrefValue).toBe(checkoutUrl);
    expect(openSpy).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/stripe/create-checkout-session',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ plan: 'annual' }) }),
    );
  });
});
