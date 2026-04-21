import { describe, it, expect, vi, beforeEach } from 'vitest';
import type Stripe from 'stripe';

// Mock the handlers module BEFORE importing route.ts. vi.mock is hoisted,
// so the factory runs first and dispatchEvent sees the mocked handlers.
vi.mock('@/app/api/stripe/webhook/handlers', () => ({
  handleCheckoutCompleted: vi.fn(),
  handleSubscriptionChange: vi.fn(),
  handleSubscriptionDeleted: vi.fn(),
  handlePaymentFailed: vi.fn(),
}));

// Stripe client is imported at the top of route.ts for signature verification
// in POST(); dispatchEvent doesn't call it, but the import still happens.
// Mock it so the module load doesn't require real STRIPE_SECRET_KEY.
vi.mock('@/lib/stripe/client', () => ({
  stripe: {
    webhooks: { constructEvent: (body: string) => JSON.parse(body) },
  },
}));

import * as handlers from '@/app/api/stripe/webhook/handlers';
import { dispatchEvent } from '@/app/api/stripe/webhook/route';

function makeEvent(type: string): Stripe.Event {
  return { type, data: { object: {} } } as unknown as Stripe.Event;
}

describe('stripe webhook event routing', () => {
  beforeEach(() => {
    vi.mocked(handlers.handleCheckoutCompleted).mockReset();
    vi.mocked(handlers.handleSubscriptionChange).mockReset();
    vi.mocked(handlers.handleSubscriptionDeleted).mockReset();
    vi.mocked(handlers.handlePaymentFailed).mockReset();
  });

  it('routes checkout.session.completed to handleCheckoutCompleted', async () => {
    await dispatchEvent(makeEvent('checkout.session.completed'));
    expect(handlers.handleCheckoutCompleted).toHaveBeenCalledOnce();
    expect(handlers.handleSubscriptionChange).not.toHaveBeenCalled();
    expect(handlers.handleSubscriptionDeleted).not.toHaveBeenCalled();
    expect(handlers.handlePaymentFailed).not.toHaveBeenCalled();
  });

  it('routes customer.subscription.created to handleSubscriptionChange', async () => {
    await dispatchEvent(makeEvent('customer.subscription.created'));
    expect(handlers.handleSubscriptionChange).toHaveBeenCalledOnce();
  });

  it('routes customer.subscription.updated to handleSubscriptionChange', async () => {
    await dispatchEvent(makeEvent('customer.subscription.updated'));
    expect(handlers.handleSubscriptionChange).toHaveBeenCalledOnce();
  });

  it('routes customer.subscription.deleted to handleSubscriptionDeleted', async () => {
    await dispatchEvent(makeEvent('customer.subscription.deleted'));
    expect(handlers.handleSubscriptionDeleted).toHaveBeenCalledOnce();
  });

  it('routes invoice.payment_failed to handlePaymentFailed', async () => {
    await dispatchEvent(makeEvent('invoice.payment_failed'));
    expect(handlers.handlePaymentFailed).toHaveBeenCalledOnce();
  });

  it('silently ignores unhandled event types', async () => {
    await expect(dispatchEvent(makeEvent('invoice.created'))).resolves.toBeUndefined();
    expect(handlers.handleCheckoutCompleted).not.toHaveBeenCalled();
    expect(handlers.handleSubscriptionChange).not.toHaveBeenCalled();
    expect(handlers.handleSubscriptionDeleted).not.toHaveBeenCalled();
    expect(handlers.handlePaymentFailed).not.toHaveBeenCalled();
  });

  it('propagates handler errors', async () => {
    vi.mocked(handlers.handleCheckoutCompleted).mockRejectedValueOnce(new Error('boom'));
    await expect(dispatchEvent(makeEvent('checkout.session.completed'))).rejects.toThrow('boom');
  });
});
