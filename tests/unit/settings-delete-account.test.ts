import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Teardown-ordering guard for `deleteAccountAction` (FOLLOW_UPS #86).
 *
 * The invariant under test: the irreversible storage wipe (the person's
 * irreplaceable recordings) runs LAST, after the account is provably gone.
 * So —
 *   - any earlier failure (a row delete or the auth-user delete) must abort
 *     into `{ ok: false }` WITHOUT having touched storage, keeping the
 *     "nothing was lost" failure terminal truthful; and
 *   - a storage failure at the very end is best-effort — it must NOT flip a
 *     closed account's result to failure (which would render "nothing was
 *     lost" over an account whose data is already being removed).
 *
 * The real `checkedWrite` / `bestEffortWrite` primitives are used (not mocked)
 * so the throw-vs-swallow behaviour is exercised for real.
 */

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));
vi.mock('@/lib/supabase/service', () => ({
  createSupabaseServiceClient: vi.fn(),
}));
vi.mock('@/lib/stripe/client', () => ({
  stripe: { subscriptions: { cancel: vi.fn() } },
}));
vi.mock('@/lib/feature-flags', () => ({
  // Stripe cancel (step 1) is out of scope for the ordering test; skip it so
  // the sequence under test is rows → auth → storage.
  isFeatureEnabled: vi.fn(() => false),
}));
vi.mock('@/lib/profile/avatar', () => ({
  AVATAR_BUCKET: 'essence-avatars',
}));
vi.mock('@/lib/logger', () => ({
  logEvent: vi.fn(),
  logError: vi.fn(),
  generateRequestId: () => 'req_test',
}));

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { logError } from '@/lib/logger';
import { deleteAccountAction } from '@/app/app/settings/actions';

const USER_ID = 'user_1';
const AUDIO_BUCKET = 'essence-audio';
const AVATAR_BUCKET = 'essence-avatars';

interface ServiceOpts {
  /** Table whose delete should fail (simulates a Postgrest error). */
  failOnTable?: 'usage_events' | 'messages' | 'training_clips' | 'voice_profiles';
  /** Non-null → `auth.admin.deleteUser` returns this error. */
  authError?: unknown;
  /** Non-null → every `storage.remove` returns this error. */
  storageRemoveError?: unknown;
}

/** Records the ordered sequence of destructive operations for assertion. */
function makeService(opts: ServiceOpts = {}) {
  const calls: string[] = [];
  const service = {
    from(table: string) {
      const builder: {
        _delete?: boolean;
        delete: () => typeof builder;
        select: () => typeof builder;
        eq: () => typeof builder;
        then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => Promise<unknown>;
      } = {
        delete() {
          builder._delete = true;
          return builder;
        },
        select() {
          return builder;
        },
        eq() {
          return builder;
        },
        then(resolve, reject) {
          calls.push(`delete:${table}`);
          const error = opts.failOnTable === table ? { message: `boom:${table}` } : null;
          return Promise.resolve({ data: null, error }).then(resolve, reject);
        },
      };
      return builder;
    },
    storage: {
      from(bucket: string) {
        return {
          async list() {
            calls.push(`storage.list:${bucket}`);
            return { data: [{ name: 'clip.webm', id: 'obj_1' }], error: null };
          },
          async remove() {
            calls.push(`storage.remove:${bucket}`);
            return { data: null, error: opts.storageRemoveError ?? null };
          },
        };
      },
    },
    auth: {
      admin: {
        async deleteUser() {
          calls.push('auth.deleteUser');
          return { data: null, error: opts.authError ?? null };
        },
      },
    },
    calls,
  };
  return service;
}

beforeEach(() => {
  vi.mocked(createSupabaseServerClient).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: { id: USER_ID } } }) },
  } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.mocked(createSupabaseServiceClient).mockReset();
  vi.mocked(logError).mockClear();
});

function useService(opts: ServiceOpts = {}) {
  const svc = makeService(opts);
  vi.mocked(createSupabaseServiceClient).mockReturnValue(
    svc as unknown as ReturnType<typeof createSupabaseServiceClient>,
  );
  return svc;
}

describe('deleteAccountAction teardown ordering (FU-86)', () => {
  it('happy path: deletes rows and the auth user BEFORE wiping storage, and succeeds', async () => {
    const svc = useService();

    const result = await deleteAccountAction();

    expect(result).toEqual({ ok: true });

    const authIdx = svc.calls.indexOf('auth.deleteUser');
    const firstRemoveIdx = svc.calls.findIndex((c) => c.startsWith('storage.remove'));
    const lastRowDeleteIdx = svc.calls.lastIndexOf('delete:voice_profiles');

    // Row deletes precede the auth delete, which precedes any storage wipe.
    expect(lastRowDeleteIdx).toBeGreaterThanOrEqual(0);
    expect(authIdx).toBeGreaterThan(lastRowDeleteIdx);
    expect(firstRemoveIdx).toBeGreaterThan(authIdx);

    // Both buckets get wiped, last.
    expect(svc.calls).toContain(`storage.remove:${AUDIO_BUCKET}`);
    expect(svc.calls).toContain(`storage.remove:${AVATAR_BUCKET}`);
  });

  it('a failed row delete aborts WITHOUT touching storage or the auth user', async () => {
    const svc = useService({ failOnTable: 'messages' });

    const result = await deleteAccountAction();

    expect(result.ok).toBe(false);
    // messages delete was attempted, then it threw — nothing irreversible ran.
    expect(svc.calls).toContain('delete:messages');
    expect(svc.calls).not.toContain('auth.deleteUser');
    expect(svc.calls.some((c) => c.startsWith('storage.remove'))).toBe(false);
  });

  it('a failed auth-user delete aborts WITHOUT wiping storage', async () => {
    const svc = useService({ authError: { message: 'auth boom' } });

    const result = await deleteAccountAction();

    expect(result.ok).toBe(false);
    expect(svc.calls).toContain('auth.deleteUser');
    expect(svc.calls.some((c) => c.startsWith('storage.remove'))).toBe(false);
  });

  it('a storage-wipe failure AFTER the account is gone is best-effort: still ok, orphan logged', async () => {
    const svc = useService({ storageRemoveError: { message: 'storage boom' } });

    const result = await deleteAccountAction();

    // The account is provably closed (auth user deleted), so a late storage
    // failure must NOT surface as `{ ok: false }` — that would tell the user
    // "nothing was lost" over a closed account. It is logged as an orphan.
    expect(result).toEqual({ ok: true });
    expect(svc.calls).toContain('auth.deleteUser');
    expect(svc.calls.some((c) => c.startsWith('storage.remove'))).toBe(true);
    expect(vi.mocked(logError)).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'settings.delete_account.storage' }),
    );
  });
});
