import 'server-only';
import Stripe from 'stripe';

// Pinned to the SDK's built-in API_VERSION string.
// Stripe v22.0.2 ships API_VERSION = '2026-03-25.dahlia'.
// Check: node -e "console.log(require('stripe').API_VERSION)"

let _stripe: Stripe | undefined;

function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }
  return new Stripe(key, {
    apiVersion: '2026-03-25.dahlia',
    typescript: true,
    appInfo: {
      name: 'ESSENCE',
      version: '0.1.0',
    },
  });
}

/**
 * Lazy-initialized Stripe client. The proxy defers `new Stripe(...)` until
 * a property is first accessed — CI build's "Collecting page data" step
 * evaluates route modules that import `stripe` but never call it, and must
 * not fail when STRIPE_SECRET_KEY is absent in the CI env.
 *
 * All call-site ergonomics are preserved: consumers still
 * `import { stripe } from '@/lib/stripe/client'` and call
 * `stripe.subscriptions.retrieve(...)` as normal.
 */
export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    if (!_stripe) _stripe = getStripeClient();
    return Reflect.get(_stripe, prop, _stripe);
  },
});
