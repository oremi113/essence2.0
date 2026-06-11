import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useResource, type ResourceStatus } from '@/lib/data/useResource';

/**
 * Unit tests for useResource.
 *
 * Covers the status machine (idle/loading/success/error), keyed refetch,
 * the disabled (falsy-key) branch, imperative refetch + setData, and the
 * abort guard that stops a stale response from overwriting a fresher one.
 */

// A controllable deferred so a test can resolve/reject a fetch on demand.
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useResource — fetch-once (no key)', () => {
  it('starts loading then transitions to success with the fetched data', async () => {
    const fetcher = vi.fn(async () => [1, 2, 3]);
    const { result } = renderHook(() =>
      useResource(fetcher, { initialData: [] as number[] }),
    );

    expect(result.current.status).toBe<ResourceStatus>('loading');
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toEqual([]);

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.data).toEqual([1, 2, 3]);
    expect(result.current.error).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('captures a thrown Error message and lands in error', async () => {
    const fetcher = vi.fn(async () => {
      throw new Error('List failed');
    });
    const { result } = renderHook(() =>
      useResource(fetcher, { initialData: [] as number[] }),
    );

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe('List failed');
    expect(result.current.data).toEqual([]);
  });

  it('falls back to a generic message for a non-Error throw', async () => {
    const fetcher = vi.fn(async () => {
      throw 'boom';
    });
    const { result } = renderHook(() =>
      useResource(fetcher, { initialData: null as unknown }),
    );

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe('Something went wrong');
  });
});

describe('useResource — disabled (falsy key)', () => {
  it('stays idle and never calls the fetcher', () => {
    const fetcher = vi.fn(async () => [1]);
    const { result } = renderHook(() =>
      useResource(fetcher, { initialData: [] as number[], key: '' }),
    );

    expect(result.current.status).toBe<ResourceStatus>('idle');
    expect(result.current.isLoading).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('fetches once the key becomes truthy, and resets to idle when it clears', async () => {
    const fetcher = vi.fn(async () => ['clip']);
    const { result, rerender } = renderHook(
      ({ k }: { k: string }) =>
        useResource(fetcher, { initialData: [] as string[], key: k }),
      { initialProps: { k: '' } },
    );

    expect(result.current.status).toBe('idle');
    expect(fetcher).not.toHaveBeenCalled();

    rerender({ k: 'vp-1' });
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.data).toEqual(['clip']);

    rerender({ k: '' });
    await waitFor(() => expect(result.current.status).toBe('idle'));
    expect(result.current.data).toEqual([]);
  });
});

describe('useResource — keyed refetch', () => {
  it('refetches when the key changes', async () => {
    const fetcher = vi.fn(async () => fetcher.mock.calls.length);
    const { result, rerender } = renderHook(
      ({ k }: { k: string }) =>
        useResource(fetcher, { initialData: 0, key: k }),
      { initialProps: { k: 'a' } },
    );

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(fetcher).toHaveBeenCalledTimes(1);

    rerender({ k: 'b' });
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    expect(result.current.status).toBe('success');
  });
});

describe('useResource — imperative refetch', () => {
  it('refetch() re-runs the current fetcher', async () => {
    const fetcher = vi.fn(async () => 'data');
    const { result } = renderHook(() =>
      useResource(fetcher, { initialData: '' }),
    );

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(fetcher).toHaveBeenCalledTimes(1);

    act(() => result.current.refetch());
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  });

  it('uses the latest fetcher closure without requiring memoization', async () => {
    let payload = 'first';
    const { result, rerender } = renderHook(() =>
      useResource(async () => payload, { initialData: '' }),
    );

    await waitFor(() => expect(result.current.data).toBe('first'));

    payload = 'second';
    rerender();
    act(() => result.current.refetch());
    await waitFor(() => expect(result.current.data).toBe('second'));
  });
});

describe('useResource — setData', () => {
  it('patches cached data locally without a refetch', async () => {
    const fetcher = vi.fn(async () => [1, 2]);
    const { result } = renderHook(() =>
      useResource(fetcher, { initialData: [] as number[] }),
    );

    await waitFor(() => expect(result.current.data).toEqual([1, 2]));

    act(() => result.current.setData((prev) => [...prev, 3]));
    expect(result.current.data).toEqual([1, 2, 3]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

describe('useResource — stale response guard', () => {
  it('aborts the in-flight fetch on key change and ignores its late result', async () => {
    const first = deferred<string[]>();
    const second = deferred<string[]>();
    const fetcher = vi.fn(() =>
      fetcher.mock.calls.length === 1 ? first.promise : second.promise,
    );

    const { result, rerender } = renderHook(
      ({ k }: { k: string }) =>
        useResource(fetcher, { initialData: [] as string[], key: k }),
      { initialProps: { k: 'a' } },
    );

    // Switch key before the first fetch resolves.
    rerender({ k: 'b' });

    // Resolve the stale (aborted) fetch last — it must NOT win.
    await act(async () => {
      second.resolve(['fresh']);
      first.resolve(['stale']);
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.data).toEqual(['fresh']));
    expect(result.current.data).not.toContain('stale');
  });

  it('signals abort to the fetcher on unmount', async () => {
    let captured: AbortSignal | null = null;
    const pending = deferred<string>();
    const fetcher = vi.fn((signal: AbortSignal) => {
      captured = signal;
      return pending.promise;
    });

    const { unmount } = renderHook(() =>
      useResource(fetcher, { initialData: '' }),
    );

    expect(captured).not.toBeNull();
    expect(captured!.aborted).toBe(false);
    unmount();
    expect(captured!.aborted).toBe(true);
  });
});
