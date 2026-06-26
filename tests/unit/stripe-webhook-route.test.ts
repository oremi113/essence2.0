import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NextRequest } from 'next/server';

// Inert handlers — these route tests exercise POST()'s signature/secret/dispatch
// plumbing, not handler behavior (covered in stripe-webhook-handlers.test.ts).
vi.mock('@/app/api/stripe/webhook/handlers', () => ({
  handleCheckoutCompleted: vi.fn(),
  handleSubscriptionChange: vi.fn(),
  handleSubscriptionDeleted: vi.fn(),
  handlePaymentFailed: vi.fn(),
}));

const constructEvent = vi.fn();
vi.mock('@/lib/stripe/client', () => ({
  stripe: { webhooks: { constructEvent: (...args: unknown[]) => constructEvent(...args) } },
}));

function makeReq(body: string, signature: string | null): NextRequest {
  return {
    text: async () => body,
    headers: { get: (k: string) => (k === 'stripe-signature' ? signature : null) },
  } as unknown as NextRequest;
}

/** Import POST fresh with a chosen STRIPE_WEBHOOK_SECRET (captured at module load). */
async function loadPost(secret: string | undefined) {
  vi.resetModules();
  if (secret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
  else process.env.STRIPE_WEBHOOK_SECRET = secret;
  const mod = await import('@/app/api/stripe/webhook/route');
  return mod.POST;
}

beforeEach(() => {
  constructEvent.mockReset();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('POST /api/stripe/webhook — signature boundary', () => {
  it('500s when the webhook secret is not configured', async () => {
    const POST = await loadPost(undefined);
    const res = await POST(makeReq('{}', 'sig'));
    expect(res.status).toBe(500);
    // constructEvent must never run without a configured secret.
    expect(constructEvent).not.toHaveBeenCalled();
  });

  it('400s when the stripe-signature header is missing', async () => {
    const POST = await loadPost('whsec_test');
    const res = await POST(makeReq('{}', null));
    expect(res.status).toBe(400);
    expect(constructEvent).not.toHaveBeenCalled();
  });

  it('400s when signature verification throws (forged / tampered payload)', async () => {
    const POST = await loadPost('whsec_test');
    constructEvent.mockImplementation(() => {
      throw new Error('No signatures found matching the expected signature');
    });
    const res = await POST(makeReq('{"type":"x"}', 'bad_sig'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid signature/i);
  });

  it('verifies against the raw body, signature, and secret (in that order)', async () => {
    const POST = await loadPost('whsec_test');
    constructEvent.mockReturnValue({ type: 'invoice.created', data: { object: {} } });
    await POST(makeReq('RAW_BODY', 'sig_123'));
    expect(constructEvent).toHaveBeenCalledWith('RAW_BODY', 'sig_123', 'whsec_test');
  });

  it('200s with {received:true} on a valid, dispatched event', async () => {
    const POST = await loadPost('whsec_test');
    constructEvent.mockReturnValue({
      type: 'customer.subscription.updated',
      data: { object: {} },
    });
    const res = await POST(makeReq('{}', 'sig'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
  });

  it('200s on an unhandled event type (acknowledged, not retried)', async () => {
    const POST = await loadPost('whsec_test');
    constructEvent.mockReturnValue({ type: 'charge.refunded', data: { object: {} } });
    const res = await POST(makeReq('{}', 'sig'));
    expect(res.status).toBe(200);
  });

  it('500s when a handler throws, so Stripe retries the delivery', async () => {
    const POST = await loadPost('whsec_test');
    const handlers = await import('@/app/api/stripe/webhook/handlers');
    vi.mocked(handlers.handleSubscriptionChange).mockRejectedValueOnce(new Error('db down'));
    constructEvent.mockReturnValue({
      type: 'customer.subscription.created',
      data: { object: {} },
    });
    const res = await POST(makeReq('{}', 'sig'));
    expect(res.status).toBe(500);
  });
});
