import { describe, it, expect } from 'vitest';
import { resolveRestorePlan } from '@/lib/subscription/restore-mode';
import type { SubscriptionStatus, BillingPlan } from '@/lib/vault';

describe('resolveRestorePlan', () => {
  it('past_due → update_card (subscription still exists)', () => {
    expect(resolveRestorePlan('past_due', 'monthly')).toEqual({
      mode: 'update_card',
      plan: 'monthly',
    });
  });

  it.each(['lapsed', 'cancelled'] as const)('%s → restart (subscription is gone)', (status) => {
    expect(resolveRestorePlan(status, 'annual').mode).toBe('restart');
  });

  it('preserves the prior plan on restart (annual stays annual)', () => {
    expect(resolveRestorePlan('lapsed', 'annual').plan).toBe('annual');
  });

  it('falls back to monthly when no prior plan is known', () => {
    expect(resolveRestorePlan('lapsed', null).plan).toBe('monthly');
    expect(resolveRestorePlan('cancelled', null).plan).toBe('monthly');
  });

  it('never silently downgrades a returning annual subscriber to monthly', () => {
    // The financial-default guard: a lapsed annual user restarts on annual.
    const { plan } = resolveRestorePlan('lapsed', 'annual');
    expect(plan).not.toBe('monthly');
  });

  it('defaults an unexpected non-terminal status to the conservative update_card', () => {
    // past_due is the only non-terminal status that reaches the page, but guard
    // the contract: anything not lapsed/cancelled must not spawn a new checkout.
    for (const status of ['trial', 'active', 'none'] as SubscriptionStatus[]) {
      expect(resolveRestorePlan(status, 'monthly').mode).toBe('update_card');
    }
  });

  it('returns a valid BillingPlan for every status', () => {
    const valid: BillingPlan[] = ['monthly', 'annual'];
    for (const status of ['past_due', 'lapsed', 'cancelled'] as SubscriptionStatus[]) {
      expect(valid).toContain(resolveRestorePlan(status, null).plan);
    }
  });
});
