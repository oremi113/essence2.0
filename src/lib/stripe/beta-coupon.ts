import 'server-only';

/**
 * Decide whether the beta comp coupon may be attached to a checkout.
 *
 * `STRIPE_BETA_COUPON_ID` applies a 100%-off coupon to EVERY checkout while it
 * is set. That is exactly right for the closed beta — testers walk the real
 * Stripe screen, enter a real card, and are charged nothing, so the webhook,
 * the subscription row and the success_url reconcile all run for real at zero
 * cost. It is catastrophic the moment the keys go live: one env var left set at
 * cutover comps every paying subscriber, forever, and nothing anywhere says so.
 *
 * Until now the only thing standing between the beta and that outcome was a
 * comment in `create-checkout-session.ts` reading "UNSET THIS BEFORE CHARGING
 * REAL MONEY". A comment is not a guard.
 *
 * ## Why refuse the coupon rather than refuse the checkout
 *
 * Failing the checkout outright would be louder, and worse. If the variable is
 * still set at cutover, refusing the coupon means the first real customer is
 * charged correctly and the business works; the stale variable is then inert.
 * Throwing would block every checkout until someone noticed a conversion rate
 * of zero. The outcome we actually must prevent — silently comping real
 * subscribers — is impossible either way, so the quieter failure is the better
 * one. The refusal is logged by the caller so it is discoverable.
 *
 * ## Why not assert at boot
 *
 * `client.ts` initialises Stripe lazily and on purpose: CI's "Collecting page
 * data" step evaluates route modules with no `STRIPE_SECRET_KEY` present, and
 * must not fail. A module-level assertion here would reintroduce exactly that
 * breakage.
 */

/**
 * Stripe live-mode secret keys begin `sk_live_`; restricted live keys begin
 * `rk_live_`. Test keys (`sk_test_`, `rk_test_`) are the beta's normal state.
 * An absent or unrecognised key is NOT treated as live — the coupon is a beta
 * affordance, and a misread key should not silently start charging people.
 */
export function isLiveStripeKey(key: string | undefined): boolean {
  if (!key) return false;
  const k = key.trim();
  return k.startsWith('sk_live_') || k.startsWith('rk_live_');
}

export type BetaCouponDecision =
  /** Beta comp is on and safe to apply. */
  | { apply: true; couponId: string }
  /** No coupon configured — ordinary paid checkout. */
  | { apply: false; reason: 'not_configured' }
  /**
   * A coupon IS configured but the keys are live. Refused. The caller must log
   * this: it means production is one variable away from having comped everyone,
   * and the person who set it deserves to find out from something other than a
   * month of $0 invoices.
   */
  | { apply: false; reason: 'live_mode_refused'; couponId: string };

/** Widened so `process.env` satisfies it structurally; tests pass a literal. */
type StripeEnv = Record<string, string | undefined>;

export function resolveBetaCoupon(env: StripeEnv = process.env): BetaCouponDecision {
  const couponId = env.STRIPE_BETA_COUPON_ID?.trim();
  if (!couponId) return { apply: false, reason: 'not_configured' };

  if (isLiveStripeKey(env.STRIPE_SECRET_KEY)) {
    return { apply: false, reason: 'live_mode_refused', couponId };
  }

  return { apply: true, couponId };
}
