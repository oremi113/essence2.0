import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

/**
 * Unit tests for useCheckout — the shared vault Seal/Protect checkout starter.
 * Covers all four response branches without any Stripe round-trip:
 *   external URL → full-page assign; internal URL → router push;
 *   401 with redirect → router push; other failure → tagged console.error.
 */

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

import { useCheckout } from '@/lib/stripe/useCheckout';

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: vi.fn(async () => body),
  } as unknown as Response;
}

let assignSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  push.mockClear();
  assignSpy = vi.fn();
  // jsdom's window.location.assign is a no-op that warns; replace it so we can
  // assert external navigation without triggering "not implemented".
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, assign: assignSpy },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('useCheckout', () => {
  it('navigates full-page to an external Stripe URL (no router push)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ checkoutUrl: 'https://checkout.stripe.com/c/pay/abc' })));
    const { result } = renderHook(() => useCheckout('seal'));

    await act(async () => { await result.current('annual'); });

    expect(assignSpy).toHaveBeenCalledWith('https://checkout.stripe.com/c/pay/abc');
    expect(push).not.toHaveBeenCalled();
  });

  it('router-pushes an internal mock URL (no full-page nav)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ checkoutUrl: '/app/vault/sealed?mock=true&plan=annual' })));
    const { result } = renderHook(() => useCheckout('seal'));

    await act(async () => { await result.current('annual'); });

    expect(push).toHaveBeenCalledWith('/app/vault/sealed?mock=true&plan=annual');
    expect(assignSpy).not.toHaveBeenCalled();
  });

  it('router-pushes the redirect on a 401 carrying { redirect }', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ redirect: '/auth/sign-in?next=/app/vault/protect' }, false, 401)));
    const { result } = renderHook(() => useCheckout('protect'));

    await act(async () => { await result.current('monthly'); });

    expect(push).toHaveBeenCalledWith('/auth/sign-in?next=/app/vault/protect');
    expect(assignSpy).not.toHaveBeenCalled();
  });

  it('logs a label-tagged error and no-ops on a failure without redirect', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: 'boom' }, false, 500)));
    const { result } = renderHook(() => useCheckout('protect'));

    await act(async () => { await result.current('annual'); });

    expect(errSpy).toHaveBeenCalledWith('[protect] checkout failed', { error: 'boom' });
    expect(push).not.toHaveBeenCalled();
    expect(assignSpy).not.toHaveBeenCalled();
  });

  it('returns true when the request is handled (navigation underway)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ checkoutUrl: 'https://checkout.stripe.com/c/pay/abc' })));
    const { result } = renderHook(() => useCheckout('seal'));

    let outcome: boolean | undefined;
    await act(async () => { outcome = await result.current('annual'); });

    expect(outcome).toBe(true);
  });

  it('returns true on a 401 redirect (still handled)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ redirect: '/auth/sign-in' }, false, 401)));
    const { result } = renderHook(() => useCheckout('protect'));

    let outcome: boolean | undefined;
    await act(async () => { outcome = await result.current('annual'); });

    expect(outcome).toBe(true);
  });

  it('returns false on a failure without redirect (so the caller can recover)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: 'boom' }, false, 500)));
    const { result } = renderHook(() => useCheckout('protect'));

    let outcome: boolean | undefined;
    await act(async () => { outcome = await result.current('annual'); });

    expect(outcome).toBe(false);
  });

  it('returns false and recovers when the request throws (offline)', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    const { result } = renderHook(() => useCheckout('seal'));

    let outcome: boolean | undefined;
    // No unhandled rejection: the hook catches the network error and signals failure.
    await act(async () => { outcome = await result.current('monthly'); });

    expect(outcome).toBe(false);
    expect(errSpy).toHaveBeenCalledWith('[seal] checkout request errored', expect.any(TypeError));
    expect(push).not.toHaveBeenCalled();
    expect(assignSpy).not.toHaveBeenCalled();
  });

  it('posts the chosen plan to the checkout endpoint', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ checkoutUrl: '/x' }));
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useCheckout('seal'));

    await act(async () => { await result.current('monthly'); });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/stripe/create-checkout-session',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ plan: 'monthly' }),
      }),
    );
  });
});
