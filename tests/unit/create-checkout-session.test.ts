import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// 'server-only' (imported by the lib under test) is aliased to an empty stub in
// vitest.config.ts so this module resolves under the runner.
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));
vi.mock('@/lib/stripe/client', () => ({
  stripe: {
    customers: { retrieve: vi.fn(), create: vi.fn() },
    checkout: { sessions: { create: vi.fn() } },
  },
}));

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe/client';
import { createCheckoutSession } from '@/lib/stripe/create-checkout-session';

const USER = { id: 'user_1', email: 'u@example.com' };

/**
 * Server-client mock: fixed `auth.getUser`, and a results queue consumed in
 * order by the profile select (maybeSingle) and the customer-id update (eq).
 */
function mockServer({
  user = USER,
  results = [] as Array<{ data?: unknown; error?: unknown }>,
}: {
  user?: unknown;
  results?: Array<{ data?: unknown; error?: unknown }>;
}) {
  const calls = { updates: [] as Array<Record<string, unknown>> };
  const client = {
    auth: { getUser: async () => ({ data: { user } }) },
    from() {
      const builder = {
        select() {
          return builder;
        },
        update(payload: Record<string, unknown>) {
          calls.updates.push(payload);
          return builder;
        },
        eq() {
          return builder;
        },
        limit() {
          return builder;
        },
        maybeSingle() {
          return builder;
        },
        then(resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) {
          const r = results.length ? results.shift() : { data: null, error: null };
          return Promise.resolve(r).then(resolve, reject);
        },
      };
      return builder;
    },
    calls,
  };
  vi.mocked(createSupabaseServerClient).mockResolvedValue(
    client as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>,
  );
  return client;
}

async function expectCode(p: Promise<unknown>, code: string) {
  await expect(p).rejects.toMatchObject({ code });
}

beforeEach(() => {
  process.env.STRIPE_PRICE_ID_VAULT_MONTHLY = 'price_monthly';
  process.env.STRIPE_PRICE_ID_VAULT_ANNUAL = 'price_annual';
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3100';
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.mocked(stripe.customers.retrieve).mockReset();
  vi.mocked(stripe.customers.create).mockReset();
  vi.mocked(stripe.checkout.sessions.create).mockReset();
  vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
    url: 'https://checkout.stripe.com/c/pay/cs_test',
  } as never);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createCheckoutSession — auth + profile gates', () => {
  it('throws unauthenticated when there is no user', async () => {
    mockServer({ user: null });
    await expectCode(createCheckoutSession('monthly'), 'unauthenticated');
  });

  it('throws profile_lookup_failed when the profile read errors', async () => {
    mockServer({ results: [{ data: null, error: { message: 'boom' } }] });
    await expectCode(createCheckoutSession('monthly'), 'profile_lookup_failed');
  });

  it('throws profile_missing when no profile row exists (would FK-fail post-charge)', async () => {
    mockServer({ results: [{ data: null, error: null }] });
    await expectCode(createCheckoutSession('monthly'), 'profile_missing');
  });
});

describe('createCheckoutSession — customer reconciliation', () => {
  it('reuses an existing, live Stripe customer (no create, no re-persist)', async () => {
    const srv = mockServer({ results: [{ data: { stripe_customer_id: 'cus_live' }, error: null }] });
    vi.mocked(stripe.customers.retrieve).mockResolvedValue({ id: 'cus_live' } as never);

    const res = await createCheckoutSession('monthly');

    expect(res.checkoutUrl).toContain('checkout.stripe.com');
    expect(stripe.customers.create).not.toHaveBeenCalled();
    expect(srv.calls.updates).toHaveLength(0);
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_live', mode: 'subscription' }),
    );
  });

  it('recreates the customer when the stored id was deleted in Stripe', async () => {
    const srv = mockServer({
      results: [{ data: { stripe_customer_id: 'cus_dead' }, error: null }, { error: null }],
    });
    vi.mocked(stripe.customers.retrieve).mockResolvedValue({ id: 'cus_dead', deleted: true } as never);
    vi.mocked(stripe.customers.create).mockResolvedValue({ id: 'cus_fresh' } as never);

    await createCheckoutSession('monthly');

    expect(stripe.customers.create).toHaveBeenCalledOnce();
    expect(srv.calls.updates[0]).toMatchObject({ stripe_customer_id: 'cus_fresh' });
  });

  it('recreates the customer when Stripe reports resource_missing', async () => {
    mockServer({
      results: [{ data: { stripe_customer_id: 'cus_gone' }, error: null }, { error: null }],
    });
    vi.mocked(stripe.customers.retrieve).mockRejectedValue({ code: 'resource_missing' });
    vi.mocked(stripe.customers.create).mockResolvedValue({ id: 'cus_fresh' } as never);

    await expect(createCheckoutSession('monthly')).resolves.toMatchObject({
      checkoutUrl: expect.stringContaining('checkout.stripe.com'),
    });
  });

  it('rethrows an unexpected Stripe error during customer retrieve', async () => {
    mockServer({ results: [{ data: { stripe_customer_id: 'cus_x' }, error: null }] });
    vi.mocked(stripe.customers.retrieve).mockRejectedValue({ code: 'rate_limit' });
    await expect(createCheckoutSession('monthly')).rejects.toMatchObject({ code: 'rate_limit' });
  });
});

describe('createCheckoutSession — FOLLOW_UPS #44: customer-id persist is checked', () => {
  it('throws (aborting checkout) when the stripe_customer_id write fails', async () => {
    // Without the guard a failed write would leak a duplicate-customer path:
    // checkout would still succeed here, profiles stays null, and the NEXT
    // checkout creates a second Stripe customer. The guard must abort instead.
    mockServer({
      results: [
        { data: { stripe_customer_id: null }, error: null },
        { error: { message: 'write failed' } },
      ],
    });
    vi.mocked(stripe.customers.create).mockResolvedValue({ id: 'cus_new' } as never);

    await expectCode(createCheckoutSession('monthly'), 'profile_lookup_failed');
    // Critically, we aborted BEFORE creating the checkout session.
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it('persists and proceeds when the write succeeds', async () => {
    const srv = mockServer({
      results: [{ data: { stripe_customer_id: null }, error: null }, { error: null }],
    });
    vi.mocked(stripe.customers.create).mockResolvedValue({ id: 'cus_new' } as never);

    await expect(createCheckoutSession('monthly')).resolves.toBeTruthy();
    expect(srv.calls.updates[0]).toMatchObject({ stripe_customer_id: 'cus_new' });
    expect(stripe.checkout.sessions.create).toHaveBeenCalledOnce();
  });
});

describe('createCheckoutSession — roadmap #5: trial-abuse guard', () => {
  // The restore flow re-enters this same checkout for lapsed/cancelled users.
  // The 7-day trial must be a one-time benefit, or a cancel-before-convert loop
  // = perpetual free access. Queue order after a reused live customer is
  // [profile select, prior-subscription lookup].
  it('does NOT grant a trial to a returning subscriber (prior subscription exists)', async () => {
    mockServer({
      results: [
        { data: { stripe_customer_id: 'cus_live' }, error: null },
        { data: { id: 'sub_prior' }, error: null },
      ],
    });
    vi.mocked(stripe.customers.retrieve).mockResolvedValue({ id: 'cus_live' } as never);

    await createCheckoutSession('monthly');

    const arg = vi.mocked(stripe.checkout.sessions.create).mock.calls[0]?.[0];
    if (!arg) throw new Error('checkout.sessions.create was not called');
    expect(arg.subscription_data?.trial_period_days).toBeUndefined();
    // Metadata is still stamped so the webhook can attribute the restart.
    expect(arg.subscription_data?.metadata).toMatchObject({
      user_id: 'user_1',
      billing_period: 'monthly',
    });
  });

  it('grants the 7-day trial to a first-timer (no prior subscription row)', async () => {
    mockServer({
      results: [
        { data: { stripe_customer_id: 'cus_live' }, error: null },
        { data: null, error: null },
      ],
    });
    vi.mocked(stripe.customers.retrieve).mockResolvedValue({ id: 'cus_live' } as never);

    await createCheckoutSession('monthly');

    const arg = vi.mocked(stripe.checkout.sessions.create).mock.calls[0]?.[0];
    if (!arg) throw new Error('checkout.sessions.create was not called');
    expect(arg.subscription_data?.trial_period_days).toBe(7);
  });

  it('aborts (no checkout) when the prior-subscription lookup errors', async () => {
    mockServer({
      results: [
        { data: { stripe_customer_id: 'cus_live' }, error: null },
        { data: null, error: { message: 'boom' } },
      ],
    });
    vi.mocked(stripe.customers.retrieve).mockResolvedValue({ id: 'cus_live' } as never);

    await expectCode(createCheckoutSession('monthly'), 'profile_lookup_failed');
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });
});

describe('createCheckoutSession — pricing + session shape', () => {
  it('selects the annual price id for the annual plan and stamps metadata', async () => {
    mockServer({ results: [{ data: { stripe_customer_id: 'cus_live' }, error: null }] });
    vi.mocked(stripe.customers.retrieve).mockResolvedValue({ id: 'cus_live' } as never);

    await createCheckoutSession('annual');

    const arg = vi.mocked(stripe.checkout.sessions.create).mock.calls[0]?.[0];
    if (!arg) throw new Error('checkout.sessions.create was not called');
    expect(arg.line_items?.[0]).toMatchObject({ price: 'price_annual' });
    expect(arg.subscription_data?.trial_period_days).toBe(7);
    expect(arg.subscription_data?.metadata).toMatchObject({
      user_id: 'user_1',
      billing_period: 'annual',
    });
    expect(arg.metadata).toMatchObject({ user_id: 'user_1', billing_period: 'annual' });
  });

  it('throws missing_price_id when the plan price env is absent', async () => {
    delete process.env.STRIPE_PRICE_ID_VAULT_MONTHLY;
    mockServer({ results: [{ data: { stripe_customer_id: 'cus_live' }, error: null }] });
    vi.mocked(stripe.customers.retrieve).mockResolvedValue({ id: 'cus_live' } as never);
    await expectCode(createCheckoutSession('monthly'), 'missing_price_id');
  });

  it('throws stripe_error when Stripe returns no checkout url', async () => {
    mockServer({ results: [{ data: { stripe_customer_id: 'cus_live' }, error: null }] });
    vi.mocked(stripe.customers.retrieve).mockResolvedValue({ id: 'cus_live' } as never);
    vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({ url: null } as never);
    await expectCode(createCheckoutSession('monthly'), 'stripe_error');
  });
});
