import 'server-only';
import Stripe from 'stripe';

// Pinned to the SDK's built-in API_VERSION string.
// Stripe v22.0.2 ships API_VERSION = '2026-03-25.dahlia'.
// Check: node -e "console.log(require('stripe').API_VERSION)"
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2026-03-25.dahlia',
  typescript: true,
  appInfo: {
    name: 'ESSENCE',
    version: '0.1.0',
  },
});
