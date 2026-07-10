import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type Stripe from 'stripe';

// Mock the service-role Supabase client and the Stripe SDK BEFORE importing the
// handlers. vi.mock is hoisted, so these factories run first.
vi.mock('@/lib/supabase/service', () => ({
  createSupabaseServiceClient: vi.fn(),
}));
vi.mock('@/lib/stripe/client', () => ({
  stripe: { subscriptions: { retrieve: vi.fn() } },
}));

import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { stripe } from '@/lib/stripe/client';
import {
  handleCheckoutCompleted,
  handleSubscriptionChange,
  handleSubscriptionDeleted,
  handlePaymentFailed,
} from '@/app/api/stripe/webhook/handlers';

/**
 * Minimal chainable Supabase mock. Every chain method returns the same builder;
 * the builder is a thenable that resolves to the next queued result when the
 * chain is awaited. One `await` (one terminal op) consumes one queued result,
 * and the op (table, method, payload, filters) is recorded for assertions.
 */
interface RecordedOp {
  table: string;
  method?: 'update' | 'upsert';
  select?: unknown[];
  payload?: Record<string, unknown>;
  opts?: unknown;
  eq: unknown[][];
  in: unknown[][];
  maybeSingle: boolean;
}

function makeServiceMock(queue: Array<{ data?: unknown; error?: unknown }> = []) {
  const recorded: RecordedOp[] = [];
  const client = {
    from(table: string) {
      const rec: RecordedOp = { table, eq: [], in: [], maybeSingle: false };
      const builder = {
        select(...a: unknown[]) {
          rec.select = a;
          return builder;
        },
        eq(...a: unknown[]) {
          rec.eq.push(a);
          return builder;
        },
        in(...a: unknown[]) {
          rec.in.push(a);
          return builder;
        },
        update(payload: Record<string, unknown>) {
          rec.method = 'update';
          rec.payload = payload;
          return builder;
        },
        upsert(payload: Record<string, unknown>, opts?: unknown) {
          rec.method = 'upsert';
          rec.payload = payload;
          rec.opts = opts;
          return builder;
        },
        maybeSingle() {
          rec.maybeSingle = true;
          return builder;
        },
        then(resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) {
          recorded.push(rec);
          const result = queue.length ? queue.shift() : { data: null, error: null };
          return Promise.resolve(result).then(resolve, reject);
        },
      };
      return builder;
    },
    recorded,
  };
  return client;
}

function useService(queue: Array<{ data?: unknown; error?: unknown }> = []) {
  const mock = makeServiceMock(queue);
  vi.mocked(createSupabaseServiceClient).mockReturnValue(
    mock as unknown as ReturnType<typeof createSupabaseServiceClient>,
  );
  return mock;
}

function findOp(mock: ReturnType<typeof makeServiceMock>, predicate: (op: RecordedOp) => boolean) {
  return mock.recorded.find(predicate);
}

function makeSub(overrides: Partial<Stripe.Subscription> = {}): Stripe.Subscription {
  return {
    id: 'sub_123',
    status: 'active',
    customer: 'cus_123',
    cancel_at_period_end: false,
    trial_end: null,
    metadata: { user_id: 'user_1', billing_period: 'monthly' },
    items: {
      data: [
        {
          price: { id: 'price_1', unit_amount: 1299, currency: 'usd' },
          current_period_start: 1_700_000_000,
          current_period_end: 1_702_000_000,
        },
      ],
    },
    ...overrides,
  } as unknown as Stripe.Subscription;
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.mocked(createSupabaseServiceClient).mockReset();
  vi.mocked(stripe.subscriptions.retrieve).mockReset();
});

describe('upsertSubscription via handleSubscriptionChange', () => {
  // existing-status read (null) → profile ensure → subscription upsert
  const happyQueue = () => [
    { data: null, error: null },
    { error: null },
    { error: null },
  ];

  it.each([
    ['trialing', 'trial'],
    ['active', 'active'],
    ['past_due', 'past_due'],
    ['unpaid', 'past_due'],
    ['canceled', 'cancelled'],
    ['incomplete', 'lapsed'],
    ['incomplete_expired', 'lapsed'],
  ] as const)('maps Stripe status %s → %s', async (stripeStatus, expected) => {
    const mock = useService(happyQueue());
    await handleSubscriptionChange(makeSub({ status: stripeStatus as Stripe.Subscription.Status }));

    const upsert = findOp(mock, (o) => o.table === 'subscriptions' && o.method === 'upsert');
    expect(upsert?.payload?.status).toBe(expected);
  });

  it('resets last_failed_attempt_count to 0 when recovering to active', async () => {
    const mock = useService(happyQueue());
    await handleSubscriptionChange(makeSub({ status: 'active' }));

    const upsert = findOp(mock, (o) => o.table === 'subscriptions' && o.method === 'upsert');
    expect(upsert?.payload).toHaveProperty('last_failed_attempt_count', 0);
  });

  it('does NOT touch last_failed_attempt_count on a past_due upsert (count survives)', async () => {
    const mock = useService(happyQueue());
    await handleSubscriptionChange(makeSub({ status: 'past_due' }));

    const upsert = findOp(mock, (o) => o.table === 'subscriptions' && o.method === 'upsert');
    expect(upsert?.payload).not.toHaveProperty('last_failed_attempt_count');
  });

  it('carries billing_period from metadata, defaulting to monthly', async () => {
    const mock = useService(happyQueue());
    await handleSubscriptionChange(makeSub({ metadata: { user_id: 'user_1' } as Stripe.Metadata }));

    const upsert = findOp(mock, (o) => o.table === 'subscriptions' && o.method === 'upsert');
    expect(upsert?.payload?.billing_period).toBe('monthly');
  });

  it('returns early without user_id metadata (no DB writes)', async () => {
    const mock = useService();
    await handleSubscriptionChange(makeSub({ metadata: {} as Stripe.Metadata }));
    expect(mock.recorded).toHaveLength(0);
  });

  describe('out-of-order / duplicate safety', () => {
    it.each(['lapsed', 'cancelled'] as const)(
      'skips the write when the row is already terminal (%s)',
      async (terminal) => {
        const mock = useService([{ data: { status: terminal }, error: null }]);
        await handleSubscriptionChange(makeSub({ status: 'active' }));

        // Only the status read happened; no profile ensure, no upsert.
        expect(mock.recorded).toHaveLength(1);
        expect(mock.recorded[0].maybeSingle).toBe(true);
        expect(findOp(mock, (o) => o.method === 'upsert')).toBeUndefined();
      },
    );

    it('still writes when the existing row is non-terminal (past_due → active recovery)', async () => {
      const mock = useService([
        { data: { status: 'past_due' }, error: null },
        { error: null },
        { error: null },
      ]);
      await handleSubscriptionChange(makeSub({ status: 'active' }));
      expect(findOp(mock, (o) => o.table === 'subscriptions' && o.method === 'upsert')).toBeDefined();
    });

    it('duplicate delivery is idempotent: same upsert payload twice', async () => {
      const m1 = useService(happyQueue());
      await handleSubscriptionChange(makeSub({ status: 'active' }));
      const p1 = findOp(m1, (o) => o.table === 'subscriptions' && o.method === 'upsert')?.payload;

      // Second delivery now sees the row written by the first (active, non-terminal).
      const m2 = useService([
        { data: { status: 'active' }, error: null },
        { error: null },
        { error: null },
      ]);
      await handleSubscriptionChange(makeSub({ status: 'active' }));
      const p2 = findOp(m2, (o) => o.table === 'subscriptions' && o.method === 'upsert')?.payload;

      expect(p2).toEqual(p1);
    });

    it('fails open and still writes if the status read errors', async () => {
      const mock = useService([
        { data: null, error: { message: 'read boom' } },
        { error: null },
        { error: null },
      ]);
      await handleSubscriptionChange(makeSub({ status: 'active' }));
      expect(findOp(mock, (o) => o.table === 'subscriptions' && o.method === 'upsert')).toBeDefined();
    });
  });

  it('uses upsert keyed on stripe_subscription_id (duplicate-safe conflict target)', async () => {
    const mock = useService(happyQueue());
    await handleSubscriptionChange(makeSub({ status: 'active' }));
    const upsert = findOp(mock, (o) => o.table === 'subscriptions' && o.method === 'upsert');
    expect(upsert?.opts).toMatchObject({ onConflict: 'stripe_subscription_id' });
  });
});

describe('handleSubscriptionDeleted', () => {
  it('marks lapsed when cancellation reason is payment_failed', async () => {
    const mock = useService([{ data: [{ id: 'row_1' }], error: null }]);
    await handleSubscriptionDeleted(
      makeSub({ cancellation_details: { reason: 'payment_failed' } } as Partial<Stripe.Subscription>),
    );
    const op = findOp(mock, (o) => o.method === 'update');
    expect(op?.payload?.status).toBe('lapsed');
    expect(op?.payload?.cancelled_at).toBeTruthy();
  });

  it('marks cancelled for a voluntary cancellation', async () => {
    const mock = useService([{ data: [{ id: 'row_1' }], error: null }]);
    await handleSubscriptionDeleted(
      makeSub({
        cancellation_details: { reason: 'cancellation_requested' },
      } as Partial<Stripe.Subscription>),
    );
    expect(findOp(mock, (o) => o.method === 'update')?.payload?.status).toBe('cancelled');
  });

  // FOLLOW_UPS #78 — ambiguous reason (null / disputed / retention). For these,
  // the handler reads OUR prior status first, so the queue is [read, update].
  it('marks cancelled when reason is missing and prior status was not past_due', async () => {
    const mock = useService([
      { data: { status: 'active' }, error: null },
      { data: [{ id: 'row_1' }], error: null },
    ]);
    await handleSubscriptionDeleted(makeSub());
    expect(findOp(mock, (o) => o.method === 'update')?.payload?.status).toBe('cancelled');
  });

  it('marks lapsed when reason is missing but prior status was past_due (dunning fallback)', async () => {
    const mock = useService([
      { data: { status: 'past_due' }, error: null },
      { data: [{ id: 'row_1' }], error: null },
    ]);
    await handleSubscriptionDeleted(makeSub());
    expect(findOp(mock, (o) => o.method === 'update')?.payload?.status).toBe('lapsed');
  });

  it('treats a payment_disputed cancel out of past_due as a lapse (fallback)', async () => {
    const mock = useService([
      { data: { status: 'past_due' }, error: null },
      { data: [{ id: 'row_1' }], error: null },
    ]);
    await handleSubscriptionDeleted(
      makeSub({ cancellation_details: { reason: 'payment_disputed' } } as Partial<Stripe.Subscription>),
    );
    expect(findOp(mock, (o) => o.method === 'update')?.payload?.status).toBe('lapsed');
  });

  it('falls back to cancelled (no throw) when the prior-status read errors', async () => {
    const mock = useService([
      { data: null, error: { message: 'read boom' } },
      { data: [{ id: 'row_1' }], error: null },
    ]);
    await expect(handleSubscriptionDeleted(makeSub())).resolves.toBeUndefined();
    expect(findOp(mock, (o) => o.method === 'update')?.payload?.status).toBe('cancelled');
  });

  it('warns without throwing when no row matched (out-of-order delete)', async () => {
    // Explicit reason → no prior-status read → queue is just [update].
    useService([{ data: [], error: null }]);
    await expect(
      handleSubscriptionDeleted(
        makeSub({ cancellation_details: { reason: 'payment_failed' } } as Partial<Stripe.Subscription>),
      ),
    ).resolves.toBeUndefined();
    expect(console.warn).toHaveBeenCalledOnce();
  });

  it('throws on a DB error during the update', async () => {
    // Explicit reason → single update op carries the error.
    useService([{ data: null, error: { message: 'db down' } }]);
    await expect(
      handleSubscriptionDeleted(
        makeSub({ cancellation_details: { reason: 'payment_failed' } } as Partial<Stripe.Subscription>),
      ),
    ).rejects.toBeTruthy();
  });
});

describe('handlePaymentFailed', () => {
  function makeInvoice(overrides: Record<string, unknown> = {}): Stripe.Invoice {
    return {
      id: 'in_1',
      attempt_count: 2,
      parent: {
        type: 'subscription_details',
        subscription_details: { subscription: 'sub_123' },
      },
      ...overrides,
    } as unknown as Stripe.Invoice;
  }

  it('sets past_due with the attempt count, terminal-safe', async () => {
    const mock = useService([{ data: [{ id: 'row_1' }], error: null }]);
    await handlePaymentFailed(makeInvoice());

    const op = findOp(mock, (o) => o.method === 'update');
    expect(op?.payload?.status).toBe('past_due');
    expect(op?.payload?.last_failed_attempt_count).toBe(2);
    // Terminal-safe guard: update is filtered to recoverable statuses only.
    expect(op?.in).toContainEqual(['status', ['trial', 'active', 'past_due']]);
  });

  it('warns and returns when the invoice has no subscription ref', async () => {
    const mock = useService();
    await handlePaymentFailed(makeInvoice({ parent: { type: 'invoice_item' } }));
    expect(mock.recorded).toHaveLength(0);
    expect(console.warn).toHaveBeenCalledOnce();
  });

  it('warns without throwing when no recoverable row matched (already terminal)', async () => {
    useService([{ data: [], error: null }]);
    await expect(handlePaymentFailed(makeInvoice())).resolves.toBeUndefined();
    expect(console.warn).toHaveBeenCalledOnce();
  });

  it('throws on a DB error', async () => {
    useService([{ data: null, error: { message: 'db down' } }]);
    await expect(handlePaymentFailed(makeInvoice())).rejects.toBeTruthy();
  });
});

describe('handleCheckoutCompleted', () => {
  function makeSession(overrides: Partial<Stripe.Checkout.Session> = {}): Stripe.Checkout.Session {
    return {
      id: 'cs_1',
      subscription: 'sub_123',
      customer: 'cus_123',
      metadata: { user_id: 'user_1', billing_period: 'annual' },
      ...overrides,
    } as unknown as Stripe.Checkout.Session;
  }

  it('retrieves the subscription and upserts it (trial → reset counter)', async () => {
    const mock = useService([
      { data: null, error: null },
      { error: null },
      { error: null },
    ]);
    vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue(
      makeSub({ status: 'trialing', trial_end: 1_705_000_000 }) as unknown as Stripe.Response<Stripe.Subscription>,
    );

    await handleCheckoutCompleted(makeSession());

    expect(stripe.subscriptions.retrieve).toHaveBeenCalledWith('sub_123');
    const upsert = findOp(mock, (o) => o.table === 'subscriptions' && o.method === 'upsert');
    expect(upsert?.payload?.status).toBe('trial');
    expect(upsert?.payload?.billing_period).toBe('annual');
    expect(upsert?.payload).toHaveProperty('last_failed_attempt_count', 0);
  });

  it.each([
    ['missing subscription', { subscription: null }],
    ['missing customer', { customer: null }],
    ['missing user_id', { metadata: {} }],
  ] as const)('returns early on %s without touching Stripe or the DB', async (_label, override) => {
    const mock = useService();
    await handleCheckoutCompleted(makeSession(override as Partial<Stripe.Checkout.Session>));
    expect(stripe.subscriptions.retrieve).not.toHaveBeenCalled();
    expect(mock.recorded).toHaveLength(0);
  });
});

describe('upsertSubscription — serialization of sparse Stripe objects', () => {
  const happyQueue = () => [
    { data: null, error: null },
    { error: null },
    { error: null },
  ];

  function upsertOf(mock: ReturnType<typeof makeServiceMock>) {
    return findOp(mock, (o) => o.table === 'subscriptions' && o.method === 'upsert')?.payload;
  }

  it('resolves an object-form customer to its id', async () => {
    const mock = useService(happyQueue());
    await handleSubscriptionChange(
      makeSub({ customer: { id: 'cus_obj' } as Stripe.Customer }),
    );
    expect(upsertOf(mock)?.stripe_customer_id).toBe('cus_obj');
  });

  it('does not crash on an empty items list — falls back to safe defaults', async () => {
    const mock = useService(happyQueue());
    await handleSubscriptionChange(
      makeSub({ items: { data: [] } as unknown as Stripe.ApiList<Stripe.SubscriptionItem> }),
    );
    const p = upsertOf(mock);
    expect(p?.stripe_price_id).toBe('');
    expect(p?.price_amount_cents).toBe(0);
    expect(p?.currency).toBe('usd');
    expect(p?.current_period_start).toBeNull();
    expect(p?.current_period_end).toBeNull();
  });

  it('maps trial_end null → null and a timestamp → ISO string', async () => {
    const m1 = useService(happyQueue());
    await handleSubscriptionChange(makeSub({ status: 'active', trial_end: null }));
    expect(upsertOf(m1)?.trial_ends_at).toBeNull();

    const m2 = useService(happyQueue());
    await handleSubscriptionChange(makeSub({ status: 'trialing', trial_end: 1_700_000_000 }));
    expect(upsertOf(m2)?.trial_ends_at).toBe(new Date(1_700_000_000 * 1000).toISOString());
  });
});
