import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type Stripe from 'stripe';

// 'server-only' (imported by the lib under test) is aliased to an empty stub in
// vitest.config.ts. Mock the Stripe SDK and the webhook handler BEFORE importing
// the lib — vi.mock is hoisted.
vi.mock('@/lib/stripe/client', () => ({
  stripe: { checkout: { sessions: { retrieve: vi.fn() } } },
}));
vi.mock('@/app/api/stripe/webhook/handlers', () => ({
  handleCheckoutCompleted: vi.fn(),
}));

import { stripe } from '@/lib/stripe/client';
import { handleCheckoutCompleted } from '@/app/api/stripe/webhook/handlers';
import { reconcileCheckoutSession } from '@/lib/stripe/reconcile-checkout-session';

const USER = 'user_1';

const retrieve = vi.mocked(stripe.checkout.sessions.retrieve);
const handle = vi.mocked(handleCheckoutCompleted);

function session(overrides: Partial<Stripe.Checkout.Session> = {}) {
  return {
    id: 'cs_test_1',
    status: 'complete',
    metadata: { user_id: USER },
    subscription: 'sub_1',
    customer: 'cus_1',
    ...overrides,
  } as unknown as Stripe.Checkout.Session;
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  retrieve.mockReset();
  handle.mockReset();
});

describe('reconcileCheckoutSession', () => {
  it('reconciles a completed, owned session via the webhook path', async () => {
    retrieve.mockResolvedValue(session() as never);

    const result = await reconcileCheckoutSession('cs_test_1', USER);

    expect(result).toEqual({ status: 'reconciled' });
    expect(handle).toHaveBeenCalledOnce();
    expect(handle).toHaveBeenCalledWith(expect.objectContaining({ id: 'cs_test_1' }));
  });

  it('refuses a session whose user_id metadata does not match the caller', async () => {
    retrieve.mockResolvedValue(session({ metadata: { user_id: 'someone_else' } }) as never);

    const result = await reconcileCheckoutSession('cs_test_1', USER);

    expect(result).toEqual({ status: 'not_owned' });
    expect(handle).not.toHaveBeenCalled();
  });

  it('refuses a session with no user_id metadata', async () => {
    retrieve.mockResolvedValue(session({ metadata: {} }) as never);

    const result = await reconcileCheckoutSession('cs_test_1', USER);

    expect(result).toEqual({ status: 'not_owned' });
    expect(handle).not.toHaveBeenCalled();
  });

  it('reports incomplete for a session that is not `complete` (unpaid)', async () => {
    retrieve.mockResolvedValue(session({ status: 'open' }) as never);

    const result = await reconcileCheckoutSession('cs_test_1', USER);

    expect(result).toEqual({ status: 'incomplete' });
    expect(handle).not.toHaveBeenCalled();
  });

  it('reconciles a trial checkout (status complete, no immediate payment)', async () => {
    // A 7-day trial completes with payment_status `no_payment_required`; the gate
    // is on `status`, so the trial must still reconcile.
    retrieve.mockResolvedValue(
      session({ payment_status: 'no_payment_required' } as Partial<Stripe.Checkout.Session>) as never,
    );

    const result = await reconcileCheckoutSession('cs_test_1', USER);

    expect(result).toEqual({ status: 'reconciled' });
    expect(handle).toHaveBeenCalledOnce();
  });

  it('reports error and does not throw when retrieve fails', async () => {
    retrieve.mockRejectedValue(new Error('stripe down'));

    const result = await reconcileCheckoutSession('cs_test_1', USER);

    expect(result).toEqual({ status: 'error' });
    expect(handle).not.toHaveBeenCalled();
  });

  it('reports error and does not throw when the handler write fails', async () => {
    retrieve.mockResolvedValue(session() as never);
    handle.mockRejectedValue(new Error('db write failed'));

    const result = await reconcileCheckoutSession('cs_test_1', USER);

    expect(result).toEqual({ status: 'error' });
  });
});
