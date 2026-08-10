import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Regression coverage for FOLLOW_UPS #85 — the delete-account teardown must
 * fail CLOSED on the step-1 `subscriptions` READ, not just on its writes.
 *
 * A Supabase `.select()` that errors resolves as `{ data: null, error }` (it
 * does not throw), so the action's own try/catch never catches it. Before the
 * fix the error was discarded: a transient read hiccup yielded `subs === null`,
 * skipped every Stripe cancellation, and the teardown still deleted rows + the
 * auth user — leaving a live subscription billing a card for an account that no
 * longer exists. These tests pin the corrected behavior: a read error aborts
 * BEFORE any irreversible step, and the healthy path is unaffected.
 */

const userId = 'user-1';

// Per-test control of the subscriptions read result.
let subsData: Array<{ stripe_subscription_id: string | null; status: string }> | null;
let subsError: unknown;

// Spies for every destructive step — none may fire when the read errors.
const cancelSpy = vi.fn(() => Promise.resolve());
const removeSpy = vi.fn(() => Promise.resolve({ error: null }));
const deleteUserSpy = vi.fn(() => Promise.resolve({ error: null }));
const checkedWriteSpy = vi.fn(() => Promise.resolve());
const logErrorSpy = vi.fn();

// The factories below are hoisted above the spy declarations, so they reference
// the spies through deferred wrapper arrows (evaluated at call-time, once the
// consts exist) rather than binding them directly — the standard vitest pattern.
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: userId } } }) },
  }),
}));

vi.mock('@/lib/supabase/service', () => ({
  createSupabaseServiceClient: () => ({
    from: () => ({
      select: () => ({
        eq: async () => ({ data: subsData, error: subsError }),
      }),
      delete: () => ({ eq: () => ({ __builder: true }) }),
    }),
    storage: {
      from: () => ({
        list: async () => ({ data: [] }),
        remove: () => removeSpy(),
      }),
    },
    auth: { admin: { deleteUser: () => deleteUserSpy() } },
  }),
}));

vi.mock('@/lib/supabase/checked-write', () => ({
  checkedWrite: () => checkedWriteSpy(),
  bestEffortWrite: async () => {},
}));

vi.mock('@/lib/stripe/client', () => ({
  stripe: { subscriptions: { cancel: () => cancelSpy() } },
}));

vi.mock('@/lib/feature-flags', () => ({
  isFeatureEnabled: (flag: string) => flag === 'VAULT_STRIPE_ENABLED',
}));

vi.mock('@/lib/profile/avatar', () => ({ AVATAR_BUCKET: 'essence-avatars' }));

vi.mock('@/lib/logger', () => ({
  logEvent: () => {},
  logError: (arg: unknown) => logErrorSpy(arg),
  generateRequestId: () => 'req-test',
}));

import { deleteAccountAction } from '@/app/app/settings/actions';

beforeEach(() => {
  subsData = null;
  subsError = null;
  cancelSpy.mockClear();
  removeSpy.mockClear();
  deleteUserSpy.mockClear();
  checkedWriteSpy.mockClear();
  logErrorSpy.mockClear();
});

describe('deleteAccountAction — subscriptions read is fail-closed (FU-85)', () => {
  it('aborts without touching data when the subscriptions read errors', async () => {
    subsData = null;
    subsError = { message: 'transient read failure', code: '57014' };

    const result = await deleteAccountAction();

    expect(result.ok).toBe(false);
    // Nothing irreversible ran: no cancel, no row deletes, no auth delete, no wipe.
    expect(cancelSpy).not.toHaveBeenCalled();
    expect(checkedWriteSpy).not.toHaveBeenCalled();
    expect(deleteUserSpy).not.toHaveBeenCalled();
    expect(removeSpy).not.toHaveBeenCalled();
    // The failure is logged against the dedicated read event.
    expect(logErrorSpy).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'settings.delete_account.subscriptions_read' }),
    );
  });

  it('proceeds through the teardown when the read succeeds (no false positive)', async () => {
    subsData = []; // healthy read, no live subscriptions
    subsError = null;

    const result = await deleteAccountAction();

    expect(result.ok).toBe(true);
    // The read error branch did not fire.
    expect(logErrorSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ event: 'settings.delete_account.subscriptions_read' }),
    );
    // Row deletes still run (4 tables), auth user still deleted.
    expect(checkedWriteSpy).toHaveBeenCalledTimes(4);
    expect(deleteUserSpy).toHaveBeenCalledTimes(1);
  });
});
