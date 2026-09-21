import { describe, it, expect } from 'vitest';
import { resolveBetaCoupon, isLiveStripeKey } from '@/lib/stripe/beta-coupon';

/**
 * The launch landmine this closes: `STRIPE_BETA_COUPON_ID` applies a 100%-off
 * coupon to EVERY checkout while it is set. Correct for the closed beta,
 * catastrophic the moment the keys go live — one variable left set at cutover
 * comps every paying subscriber, forever, and nothing says so.
 *
 * Before this guard the only protection was a source comment reading
 * "UNSET THIS BEFORE CHARGING REAL MONEY".
 */
describe('isLiveStripeKey', () => {
  it('recognises live secret and restricted keys', () => {
    expect(isLiveStripeKey('sk_live_abc123')).toBe(true);
    expect(isLiveStripeKey('rk_live_abc123')).toBe(true);
    expect(isLiveStripeKey('  sk_live_padded  ')).toBe(true);
  });

  it('does not mistake test keys for live ones', () => {
    expect(isLiveStripeKey('sk_test_abc123')).toBe(false);
    expect(isLiveStripeKey('rk_test_abc123')).toBe(false);
  });

  it('treats absent or unrecognised keys as NOT live', () => {
    // A misread key must not silently start charging beta testers.
    expect(isLiveStripeKey(undefined)).toBe(false);
    expect(isLiveStripeKey('')).toBe(false);
    expect(isLiveStripeKey('whsec_something_else')).toBe(false);
  });
});

describe('resolveBetaCoupon', () => {
  it('applies the comp in test mode — the beta’s normal state', () => {
    expect(
      resolveBetaCoupon({
        STRIPE_BETA_COUPON_ID: 'ESSENCE_BETA_100',
        STRIPE_SECRET_KEY: 'sk_test_abc',
      }),
    ).toEqual({ apply: true, couponId: 'ESSENCE_BETA_100' });
  });

  it('REFUSES the comp against a live key — the whole point', () => {
    expect(
      resolveBetaCoupon({
        STRIPE_BETA_COUPON_ID: 'ESSENCE_BETA_100',
        STRIPE_SECRET_KEY: 'sk_live_abc',
      }),
    ).toEqual({
      apply: false,
      reason: 'live_mode_refused',
      couponId: 'ESSENCE_BETA_100',
    });
  });

  it('refuses against a live RESTRICTED key too', () => {
    const d = resolveBetaCoupon({
      STRIPE_BETA_COUPON_ID: 'ESSENCE_BETA_100',
      STRIPE_SECRET_KEY: 'rk_live_abc',
    });
    expect(d.apply).toBe(false);
  });

  it('reports not_configured when no coupon is set', () => {
    expect(resolveBetaCoupon({ STRIPE_SECRET_KEY: 'sk_live_abc' })).toEqual({
      apply: false,
      reason: 'not_configured',
    });
    expect(resolveBetaCoupon({ STRIPE_SECRET_KEY: 'sk_test_abc' })).toEqual({
      apply: false,
      reason: 'not_configured',
    });
  });

  it('treats a whitespace-only coupon id as unset', () => {
    // An id that does not exist in Stripe fails checkout outright, so an
    // accidental blank must never reach the API.
    expect(
      resolveBetaCoupon({ STRIPE_BETA_COUPON_ID: '   ', STRIPE_SECRET_KEY: 'sk_test_abc' }),
    ).toEqual({ apply: false, reason: 'not_configured' });
  });

  it('trims a padded coupon id before applying it', () => {
    expect(
      resolveBetaCoupon({
        STRIPE_BETA_COUPON_ID: '  ESSENCE_BETA_100  ',
        STRIPE_SECRET_KEY: 'sk_test_abc',
      }),
    ).toEqual({ apply: true, couponId: 'ESSENCE_BETA_100' });
  });

  it('does not apply a comp when the key is missing entirely', () => {
    // Not live, but also not a working checkout — the coupon is irrelevant and
    // must not be the thing that decides. Documents current behaviour.
    expect(resolveBetaCoupon({ STRIPE_BETA_COUPON_ID: 'X' })).toEqual({
      apply: true,
      couponId: 'X',
    });
  });
});
