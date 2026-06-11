import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import {
  useUploadPipeline,
  type UploadStatus,
  type UseUploadPipelineConfig,
} from '@/lib/upload/useUploadPipeline';

/**
 * Unit tests for useUploadPipeline.
 *
 * Verifies the init -> PUT -> commit sequence, status transitions, error
 * extraction, cancel/abort semantics, reset, and optional config callbacks.
 * A cancel()-triggered AbortError lands in the distinct 'cancelled' terminal
 * state (not 'failed') with no error message — see FOLLOW_UPS #5.
 */

// ----- helpers -------------------------------------------------------------

type FetchMock = ReturnType<typeof vi.fn>;

interface MockResponseInit {
  ok?: boolean;
  status?: number;
  json?: unknown;
}

function mockResponse({ ok = true, status = 200, json }: MockResponseInit = {}) {
  return {
    ok,
    status,
    json: vi.fn(async () => json),
  } as unknown as Response;
}

/**
 * Convenience: a 3-step success sequence for init -> PUT -> commit.
 * The signed URL is returned from step 1 so step 2 targets a fixed URL.
 */
function happyPathFetch({
  init = { id: 'row-1', signedUploadUrl: 'https://s3.example/put', requiredHeaders: {} },
  commit = { ok: true },
}: { init?: Record<string, unknown>; commit?: unknown } = {}): FetchMock {
  const fetchMock = vi.fn();
  fetchMock
    .mockResolvedValueOnce(mockResponse({ ok: true, json: init }))
    .mockResolvedValueOnce(mockResponse({ ok: true }))
    .mockResolvedValueOnce(mockResponse({ ok: true, json: commit }));
  return fetchMock;
}

function baseConfig<TMeta = { name: string }>(
  overrides: Partial<UseUploadPipelineConfig<TMeta>> = {}
): UseUploadPipelineConfig<TMeta> {
  return {
    initEndpoint: '/api/init',
    commitEndpoint: '/api/commit',
    ...overrides,
  };
}

const sampleBlob = () => new Blob(['hello'], { type: 'audio/webm' });
const sampleMeta = () => ({ name: 'clip.webm' });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ----- tests ---------------------------------------------------------------

describe('useUploadPipeline — initial state', () => {
  it('starts idle with no error and exposes upload/reset/cancel', () => {
    vi.stubGlobal('fetch', vi.fn());
    const { result } = renderHook(() => useUploadPipeline(baseConfig()));
    expect(result.current.status).toBe<UploadStatus>('idle');
    expect(result.current.error).toBeNull();
    expect(typeof result.current.upload).toBe('function');
    expect(typeof result.current.reset).toBe('function');
    expect(typeof result.current.cancel).toBe('function');
  });
});

describe('useUploadPipeline — happy path', () => {
  it('fires init -> PUT -> commit in order and transitions to succeeded', async () => {
    const stages: UploadStatus[] = [];
    const fetchMock = happyPathFetch();
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() =>
      useUploadPipeline(baseConfig({ onStageChange: (s) => stages.push(s) }))
    );

    let uploadResult: { init: unknown; commit: unknown } | null = null;
    await act(async () => {
      uploadResult = await result.current.upload(sampleBlob(), sampleMeta());
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/init');
    expect(fetchMock.mock.calls[1][0]).toBe('https://s3.example/put');
    expect(fetchMock.mock.calls[1][1].method).toBe('PUT');
    expect(fetchMock.mock.calls[2][0]).toBe('/api/commit');

    expect(result.current.status).toBe<UploadStatus>('succeeded');
    expect(result.current.error).toBeNull();
    expect(stages).toEqual<UploadStatus[]>([
      'initializing',
      'uploading',
      'committing',
      'succeeded',
    ]);

    expect(uploadResult).toEqual({
      init: { id: 'row-1', signedUploadUrl: 'https://s3.example/put', requiredHeaders: {} },
      commit: { ok: true },
    });
  });

  it('defaults PUT Content-Type to blob.type when requiredHeaders is empty', async () => {
    const fetchMock = happyPathFetch();
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useUploadPipeline(baseConfig()));
    await act(async () => {
      await result.current.upload(sampleBlob(), sampleMeta());
    });
    expect(fetchMock.mock.calls[1][1].headers['Content-Type']).toBe('audio/webm');
  });

  it('prefers requiredHeaders["Content-Type"] over blob.type on PUT', async () => {
    const fetchMock = vi.fn();
    fetchMock
      .mockResolvedValueOnce(
        mockResponse({
          ok: true,
          json: {
            id: 'r',
            signedUploadUrl: 'https://s3/x',
            requiredHeaders: { 'Content-Type': 'audio/mpeg' },
          },
        })
      )
      .mockResolvedValueOnce(mockResponse({ ok: true }))
      .mockResolvedValueOnce(mockResponse({ ok: true, json: {} }));
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useUploadPipeline(baseConfig()));
    await act(async () => {
      await result.current.upload(sampleBlob(), sampleMeta());
    });
    expect(fetchMock.mock.calls[1][1].headers['Content-Type']).toBe('audio/mpeg');
  });
});

describe('useUploadPipeline — failure paths', () => {
  it('init failure: transitions initializing -> failed, no PUT or commit, error surfaced', async () => {
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(
      mockResponse({ ok: false, json: { error: 'bad', detail: 'missing name' } })
    );
    vi.stubGlobal('fetch', fetchMock);

    const stages: UploadStatus[] = [];
    const { result } = renderHook(() =>
      useUploadPipeline(baseConfig({ onStageChange: (s) => stages.push(s) }))
    );

    await act(async () => {
      await expect(result.current.upload(sampleBlob(), sampleMeta())).rejects.toThrow(
        'bad: missing name'
      );
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe<UploadStatus>('failed');
    expect(result.current.error).toBe('bad: missing name');
    expect(stages).toEqual<UploadStatus[]>(['initializing', 'failed']);
  });

  it('init failure with only `error` field falls back to error-only message', async () => {
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(mockResponse({ ok: false, json: { error: 'nope' } }));
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useUploadPipeline(baseConfig()));
    await act(async () => {
      await expect(result.current.upload(sampleBlob(), sampleMeta())).rejects.toThrow('nope');
    });
    expect(result.current.error).toBe('nope');
  });

  it('init failure with non-JSON body falls back to generic "Init upload failed"', async () => {
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: vi.fn(async () => {
        throw new Error('not json');
      }),
    } as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useUploadPipeline(baseConfig()));
    await act(async () => {
      await expect(result.current.upload(sampleBlob(), sampleMeta())).rejects.toThrow(
        'Init upload failed'
      );
    });
    expect(result.current.error).toBe('Init upload failed');
  });

  it('PUT failure: status passes uploading then fails; commit is not called', async () => {
    const fetchMock = vi.fn();
    fetchMock
      .mockResolvedValueOnce(
        mockResponse({
          ok: true,
          json: { id: 'r', signedUploadUrl: 'https://s3/x', requiredHeaders: {} },
        })
      )
      .mockResolvedValueOnce(mockResponse({ ok: false, status: 403 }));
    vi.stubGlobal('fetch', fetchMock);

    const stages: UploadStatus[] = [];
    const { result } = renderHook(() =>
      useUploadPipeline(baseConfig({ onStageChange: (s) => stages.push(s) }))
    );

    await act(async () => {
      await expect(result.current.upload(sampleBlob(), sampleMeta())).rejects.toThrow(
        'Upload failed'
      );
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe<UploadStatus>('failed');
    expect(result.current.error).toBe('Upload failed');
    expect(stages).toEqual<UploadStatus[]>(['initializing', 'uploading', 'failed']);
  });

  it('commit failure: runs all 3 fetches, ends at failed with commit error message', async () => {
    const fetchMock = vi.fn();
    fetchMock
      .mockResolvedValueOnce(
        mockResponse({
          ok: true,
          json: { id: 'r', signedUploadUrl: 'https://s3/x', requiredHeaders: {} },
        })
      )
      .mockResolvedValueOnce(mockResponse({ ok: true }))
      .mockResolvedValueOnce(
        mockResponse({ ok: false, json: { error: 'oops', detail: 'db timeout' } })
      );
    vi.stubGlobal('fetch', fetchMock);

    const stages: UploadStatus[] = [];
    const { result } = renderHook(() =>
      useUploadPipeline(baseConfig({ onStageChange: (s) => stages.push(s) }))
    );

    await act(async () => {
      await expect(result.current.upload(sampleBlob(), sampleMeta())).rejects.toThrow(
        'oops: db timeout'
      );
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.current.status).toBe<UploadStatus>('failed');
    expect(result.current.error).toBe('oops: db timeout');
    expect(stages).toEqual<UploadStatus[]>([
      'initializing',
      'uploading',
      'committing',
      'failed',
    ]);
  });

  it('commit failure with no fields falls back to generic "Commit failed"', async () => {
    const fetchMock = vi.fn();
    fetchMock
      .mockResolvedValueOnce(
        mockResponse({
          ok: true,
          json: { id: 'r', signedUploadUrl: 'https://s3/x', requiredHeaders: {} },
        })
      )
      .mockResolvedValueOnce(mockResponse({ ok: true }))
      .mockResolvedValueOnce(mockResponse({ ok: false, json: {} }));
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useUploadPipeline(baseConfig()));
    await act(async () => {
      await expect(result.current.upload(sampleBlob(), sampleMeta())).rejects.toThrow(
        'Commit failed'
      );
    });
    expect(result.current.error).toBe('Commit failed');
  });
});

describe('useUploadPipeline — cancel', () => {
  it('cancel mid-init aborts the fetch and lands at failed', async () => {
    // Fetch that rejects when the passed AbortSignal aborts.
    const fetchMock = vi.fn((_url: string, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => {
          const err = new Error('aborted');
          err.name = 'AbortError';
          reject(err);
        });
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useUploadPipeline(baseConfig()));

    let uploadPromise: Promise<unknown>;
    act(() => {
      uploadPromise = result.current.upload(sampleBlob(), sampleMeta()).catch(() => undefined);
    });
    // Inspect the signal passed to fetch.
    const firstCallSignal = (fetchMock.mock.calls[0][1] as RequestInit).signal as AbortSignal;
    expect(firstCallSignal.aborted).toBe(false);

    await act(async () => {
      result.current.cancel();
      await uploadPromise!;
    });

    expect(firstCallSignal.aborted).toBe(true);
    // A user-initiated cancel lands in 'cancelled' (not 'failed') with the
    // error cleared, so retry UIs / dashboards don't fire on it.
    expect(result.current.status).toBe<UploadStatus>('cancelled');
    expect(result.current.error).toBeNull();
  });

  it('cancel mid-PUT aborts the PUT and commit is never called', async () => {
    const fetchMock = vi.fn();
    // Init resolves immediately.
    fetchMock.mockResolvedValueOnce(
      mockResponse({
        ok: true,
        json: { id: 'r', signedUploadUrl: 'https://s3/x', requiredHeaders: {} },
      })
    );
    // PUT hangs until aborted.
    fetchMock.mockImplementationOnce((_url: string, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => {
          const err = new Error('aborted');
          err.name = 'AbortError';
          reject(err);
        });
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useUploadPipeline(baseConfig()));

    let uploadPromise: Promise<unknown>;
    act(() => {
      uploadPromise = result.current.upload(sampleBlob(), sampleMeta()).catch(() => undefined);
    });

    // Wait until the hook moves into 'uploading'.
    await waitFor(() => expect(result.current.status).toBe('uploading'));

    await act(async () => {
      result.current.cancel();
      await uploadPromise!;
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe<UploadStatus>('cancelled');
    expect(result.current.error).toBeNull();
  });

  it('cancel fires onStageChange with "cancelled", not "failed"', async () => {
    const fetchMock = vi.fn((_url: string, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => {
          const err = new Error('aborted');
          err.name = 'AbortError';
          reject(err);
        });
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const stages: UploadStatus[] = [];
    const { result } = renderHook(() =>
      useUploadPipeline(baseConfig({ onStageChange: (s) => stages.push(s) }))
    );

    let uploadPromise: Promise<unknown>;
    act(() => {
      uploadPromise = result.current.upload(sampleBlob(), sampleMeta()).catch(() => undefined);
    });

    await act(async () => {
      result.current.cancel();
      await uploadPromise!;
    });

    expect(stages).toEqual<UploadStatus[]>(['initializing', 'cancelled']);
  });

  it('cancel before any upload is a no-op', () => {
    vi.stubGlobal('fetch', vi.fn());
    const { result } = renderHook(() => useUploadPipeline(baseConfig()));

    expect(result.current.status).toBe<UploadStatus>('idle');

    act(() => {
      result.current.cancel();
    });

    expect(result.current.status).toBe<UploadStatus>('idle');
    expect(result.current.error).toBeNull();
  });

  it('cancel after success is a no-op', async () => {
    const fetchMock = happyPathFetch();
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useUploadPipeline(baseConfig()));

    await act(async () => {
      await result.current.upload(sampleBlob(), sampleMeta());
    });

    expect(result.current.status).toBe<UploadStatus>('succeeded');

    act(() => {
      result.current.cancel();
    });

    expect(result.current.status).toBe<UploadStatus>('succeeded');
    expect(result.current.error).toBeNull();
  });
});

describe('useUploadPipeline — reset and sequential uploads', () => {
  it('reset clears status and error back to idle', async () => {
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(mockResponse({ ok: false, json: { error: 'boom' } }));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useUploadPipeline(baseConfig()));

    await act(async () => {
      await expect(result.current.upload(sampleBlob(), sampleMeta())).rejects.toThrow('boom');
    });

    expect(result.current.status).toBe<UploadStatus>('failed');
    expect(result.current.error).toBe('boom');

    act(() => {
      result.current.reset();
    });

    expect(result.current.status).toBe<UploadStatus>('idle');
    expect(result.current.error).toBeNull();
  });

  it('two sequential uploads run cleanly and both end at succeeded', async () => {
    const fetchMock = vi.fn();
    // First pipeline
    fetchMock
      .mockResolvedValueOnce(
        mockResponse({
          ok: true,
          json: { id: 'a', signedUploadUrl: 'https://s3/a', requiredHeaders: {} },
        })
      )
      .mockResolvedValueOnce(mockResponse({ ok: true }))
      .mockResolvedValueOnce(mockResponse({ ok: true, json: { n: 1 } }))
      // Second pipeline
      .mockResolvedValueOnce(
        mockResponse({
          ok: true,
          json: { id: 'b', signedUploadUrl: 'https://s3/b', requiredHeaders: {} },
        })
      )
      .mockResolvedValueOnce(mockResponse({ ok: true }))
      .mockResolvedValueOnce(mockResponse({ ok: true, json: { n: 2 } }));
    vi.stubGlobal('fetch', fetchMock);

    const stages: UploadStatus[] = [];
    const { result } = renderHook(() =>
      useUploadPipeline(baseConfig({ onStageChange: (s) => stages.push(s) }))
    );

    await act(async () => {
      await result.current.upload(sampleBlob(), sampleMeta());
    });
    expect(result.current.status).toBe<UploadStatus>('succeeded');

    await act(async () => {
      await result.current.upload(sampleBlob(), sampleMeta());
    });

    expect(result.current.status).toBe<UploadStatus>('succeeded');
    expect(fetchMock).toHaveBeenCalledTimes(6);
    // Second run's stages must include a fresh initializing transition.
    expect(stages).toEqual<UploadStatus[]>([
      'initializing',
      'uploading',
      'committing',
      'succeeded',
      'initializing',
      'uploading',
      'committing',
      'succeeded',
    ]);
  });
});

describe('useUploadPipeline — config hooks', () => {
  it('buildInitBody transforms meta into the init request body', async () => {
    const fetchMock = happyPathFetch();
    vi.stubGlobal('fetch', fetchMock);

    const buildInitBody = vi.fn((meta: { name: string }) => ({ wrapped: meta.name }));
    const { result } = renderHook(() =>
      useUploadPipeline(baseConfig<{ name: string }>({ buildInitBody }))
    );

    await act(async () => {
      await result.current.upload(sampleBlob(), { name: 'x.webm' });
    });

    expect(buildInitBody).toHaveBeenCalledWith({ name: 'x.webm' });
    const initCallBody = (fetchMock.mock.calls[0][1] as RequestInit).body;
    expect(initCallBody).toBe(JSON.stringify({ wrapped: 'x.webm' }));
  });

  it('default buildInitBody sends meta directly as the init body', async () => {
    const fetchMock = happyPathFetch();
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useUploadPipeline(baseConfig()));

    await act(async () => {
      await result.current.upload(sampleBlob(), { name: 'x.webm' });
    });

    const initCallBody = (fetchMock.mock.calls[0][1] as RequestInit).body;
    expect(initCallBody).toBe(JSON.stringify({ name: 'x.webm' }));
  });

  it('default buildCommitBody sends { id: init.id } as the commit body', async () => {
    const fetchMock = happyPathFetch({
      init: { id: 'row-99', signedUploadUrl: 'https://s3.example/put', requiredHeaders: {} },
    });
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useUploadPipeline(baseConfig()));

    await act(async () => {
      await result.current.upload(sampleBlob(), sampleMeta());
    });

    const commitCallBody = (fetchMock.mock.calls[2][1] as RequestInit).body;
    expect(commitCallBody).toBe(JSON.stringify({ id: 'row-99' }));
  });

  it('buildCommitBody receives (meta, init) and controls the commit body', async () => {
    const fetchMock = happyPathFetch({
      init: { id: 'row-42', signedUploadUrl: 'https://s3.example/put', requiredHeaders: {} },
    });
    vi.stubGlobal('fetch', fetchMock);

    const buildCommitBody = vi.fn(
      (meta: { name: string }, init: { id: string }) => ({ id: init.id, source: meta.name })
    );
    const { result } = renderHook(() =>
      useUploadPipeline(baseConfig<{ name: string }>({ buildCommitBody }))
    );

    await act(async () => {
      await result.current.upload(sampleBlob(), { name: 'clip.webm' });
    });

    expect(buildCommitBody).toHaveBeenCalledTimes(1);
    expect(buildCommitBody.mock.calls[0][0]).toEqual({ name: 'clip.webm' });
    expect(
      (buildCommitBody.mock.calls[0][1] as { id: string }).id
    ).toBe('row-42');

    const commitCallBody = (fetchMock.mock.calls[2][1] as RequestInit).body;
    expect(commitCallBody).toBe(JSON.stringify({ id: 'row-42', source: 'clip.webm' }));
  });

  it('onStageChange fires for failure transitions too', async () => {
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(mockResponse({ ok: false, json: { error: 'x' } }));
    vi.stubGlobal('fetch', fetchMock);

    const onStageChange = vi.fn();
    const { result } = renderHook(() => useUploadPipeline(baseConfig({ onStageChange })));

    await act(async () => {
      await expect(result.current.upload(sampleBlob(), sampleMeta())).rejects.toThrow();
    });

    expect(onStageChange).toHaveBeenNthCalledWith(1, 'initializing');
    expect(onStageChange).toHaveBeenNthCalledWith(2, 'failed');
    expect(onStageChange).toHaveBeenCalledTimes(2);
  });
});
