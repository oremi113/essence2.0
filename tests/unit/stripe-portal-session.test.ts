import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: vi.fn() }));
vi.mock('@/lib/feature-flags', () => ({ isFeatureEnabled: vi.fn() }));
vi.mock('@/lib/stripe/client', () => ({
  stripe: { billingPortal: { sessions: { create: vi.fn() } } },
}));

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { stripe } from '@/lib/stripe/client';
import { POST } from '@/app/api/stripe/portal-session/route';

function mockServer({
  user = { id: 'user_1' },
  profile = { data: { stripe_customer_id: 'cus_1' }, error: null },
}: {
  user?: unknown;
  profile?: { data: unknown; error: unknown };
}) {
  const client = {
    auth: { getUser: async () => ({ data: { user } }) },
    from() {
      const builder = {
        select: () => builder,
        eq: () => builder,
        maybeSingle: async () => profile,
      };
      return builder;
    },
  };
  vi.mocked(createSupabaseServerClient).mockResolvedValue(
    client as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>,
  );
}

beforeEach(() => {
  vi.mocked(isFeatureEnabled).mockReturnValue(true);
  vi.mocked(stripe.billingPortal.sessions.create).mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

describe('POST /api/stripe/portal-session', () => {
  it('503s when Stripe is flag-disabled', async () => {
    vi.mocked(isFeatureEnabled).mockReturnValue(false);
    const res = await POST();
    expect(res.status).toBe(503);
  });

  it('401s with a sign-in redirect when unauthenticated', async () => {
    mockServer({ user: null });
    const res = await POST();
    expect(res.status).toBe(401);
    expect((await res.json()).redirect).toContain('next=');
  });

  it('500s when the profile lookup errors', async () => {
    mockServer({ profile: { data: null, error: { message: 'boom' } } });
    const res = await POST();
    expect(res.status).toBe(500);
  });

  it('404s when the user has no Stripe customer id', async () => {
    mockServer({ profile: { data: { stripe_customer_id: null }, error: null } });
    const res = await POST();
    expect(res.status).toBe(404);
  });

  it('returns the portal url on success', async () => {
    mockServer({});
    vi.mocked(stripe.billingPortal.sessions.create).mockResolvedValue({
      url: 'https://billing.stripe.com/p/session_1',
    } as never);
    const res = await POST();
    expect(res.status).toBe(200);
    expect((await res.json()).portalUrl).toContain('billing.stripe.com');
  });

  it('500s when Stripe portal creation throws', async () => {
    mockServer({});
    vi.mocked(stripe.billingPortal.sessions.create).mockRejectedValue(new Error('no config'));
    const res = await POST();
    expect(res.status).toBe(500);
  });
});
