"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useResource — the manual `fetch`-in-`useEffect`-with-loading/error pattern,
 * extracted once. Replaces the hand-rolled `loading`/`error`/`data` triads in
 * MemoryShelf (fetch-once) and RecordingUpload's clips list (keyed refetch).
 *
 * What it owns:
 *   - status machine (idle | loading | success | error) + derived isLoading;
 *   - a single AbortController per fetch, aborted on unmount / key change /
 *     refetch so a stale response can never overwrite a fresher one;
 *   - an imperative `refetch()` for retry buttons and post-mutation reloads;
 *   - `setData` for local/optimistic patches without a round-trip.
 *
 * What the caller owns: the `fetcher` — it builds the URL, parses the body,
 * and throws an Error (whose message becomes `error`) on failure. The fetcher
 * receives the AbortSignal so it can pass it to `fetch`.
 *
 * This hook is the single, documented home for the `react-hooks/set-state-in-
 * effect` disable that FOLLOW_UPS #32 flagged across MemoryShelf and
 * RecordingUpload's clips list. The pre-fetch loading/error reset is the
 * conventional pattern; consolidating it here means no consumer carries the
 * disable anymore. A true zero-disable version needs a cache-backed library
 * (SWR / TanStack Query) — tracked as the end state in #32.
 */

export type ResourceStatus = "idle" | "loading" | "success" | "error";

/** A key that, when falsy, disables the resource (stays idle, never fetches). */
type ResourceKey = string | number | null | undefined | false;

export interface UseResourceOptions<T> {
  /** Value `data` holds before the first successful fetch (and while disabled). */
  initialData: T;
  /**
   * Refetch identity. Changing it refetches; a falsy value (null / undefined /
   * false / "") disables the resource — it resets to `initialData`, sits in
   * "idle", and never fetches. Omit entirely for a fetch-once-on-mount
   * resource (defaults to an always-enabled constant).
   */
  key?: ResourceKey;
}

export interface UseResourceResult<T> {
  data: T;
  error: string | null;
  status: ResourceStatus;
  /** Convenience for `status === "loading"`. */
  isLoading: boolean;
  /** Refetch with the current fetcher (retry button, post-mutation reload). */
  refetch: () => void;
  /** Patch cached data locally without a round-trip (optimistic updates). */
  setData: (next: T | ((prev: T) => T)) => void;
}

function isEnabled(key: ResourceKey): boolean {
  return key !== null && key !== undefined && key !== false && key !== "";
}

export function useResource<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  options: UseResourceOptions<T>,
): UseResourceResult<T> {
  const { initialData, key = "__always__" } = options;
  const enabled = isEnabled(key);

  // The fetcher closure (and initialData) are rebuilt every render; hold them
  // in refs so the fetch effect depends only on `key` + manual refetch ticks,
  // not on identity. Callers therefore never need to memoize their fetcher. The
  // refs are synced in an effect (not during render) so the fetch effect below
  // — declared after this one — always sees the latest values on the commit
  // that triggers it.
  const fetcherRef = useRef(fetcher);
  const initialDataRef = useRef(initialData);
  useEffect(() => {
    fetcherRef.current = fetcher;
    initialDataRef.current = initialData;
  });

  const [data, setData] = useState<T>(initialData);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ResourceStatus>(enabled ? "loading" : "idle");
  const [refetchTick, setRefetchTick] = useState(0);

  const refetch = useCallback(() => setRefetchTick((t) => t + 1), []);

  // Fetch effect. The synchronous setStatus/setError resets below are the
  // conventional pre-fetch pattern, run once per key/refetch change — the
  // cascading-render concern react-hooks/set-state-in-effect guards against
  // doesn't bite. This block-level disable is the single consolidated home for
  // that pattern (FOLLOW_UPS #32); a cache-backed library would replace the
  // whole effect.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!enabled) {
      // Key cleared: drop any data left over from a prior enabled fetch.
      setStatus("idle");
      setData(initialDataRef.current);
      setError(null);
      return;
    }
    const controller = new AbortController();
    setStatus("loading");
    setError(null);
    fetcherRef.current(controller.signal).then(
      (result) => {
        if (!controller.signal.aborted) {
          setData(result);
          setStatus("success");
        }
      },
      (err) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Something went wrong");
        setStatus("error");
      },
    );
    return () => controller.abort();
    // `key` drives keyed refetches; `refetchTick` drives imperative ones.
  }, [enabled, key, refetchTick]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return {
    data,
    error,
    status,
    isLoading: status === "loading",
    refetch,
    setData,
  };
}
