import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ChangeEvent } from 'react';
import { usePhotoUpload } from '@/components/screens/onboarding/usePhotoUpload';

/**
 * Unit tests for usePhotoUpload.
 *
 * Covers initial state (empty vs filled), client-side validation
 * (type/size), happy path state transitions, minimum-ring floor,
 * stone-beat callback timing, replace flow, error path via thrown
 * onUpload, reset, object-URL lifecycle, and that unmounting during an
 * in-flight upload is safe (no thrown errors, no unhandled rejections,
 * stone override released).
 */

// ----- helpers -------------------------------------------------------------

let urlCounter = 0;
const createdUrls: string[] = [];
const revokedUrls: string[] = [];

function makeFile(
  name = 'avatar.png',
  type = 'image/png',
  size = 4
): File {
  return new File([new Uint8Array(size)], name, { type });
}

function makeOversizedFile(name = 'big.png', type = 'image/png'): File {
  // Cap lives in AVATAR_MAX_BYTES (10MB); go comfortably over.
  const bytes = new Uint8Array(11 * 1024 * 1024);
  return new File([bytes], name, { type });
}

function makeChangeEvent(file: File | null) {
  const files = file ? ([file] as unknown as FileList) : (null as unknown as FileList);
  return {
    target: {
      files,
      value: 'ignored',
    },
  } as unknown as ChangeEvent<HTMLInputElement>;
}

beforeEach(() => {
  urlCounter = 0;
  createdUrls.length = 0;
  revokedUrls.length = 0;
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => {
      urlCounter += 1;
      const url = `blob:mock/${urlCounter}`;
      createdUrls.push(url);
      return url;
    }),
    revokeObjectURL: vi.fn((url: string) => {
      revokedUrls.push(url);
    }),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// ----- tests ---------------------------------------------------------------

describe('usePhotoUpload — initial state', () => {
  it('starts in `empty` with no preview and no error when there is no initial photo', () => {
    const onUpload = vi.fn();
    const { result } = renderHook(() => usePhotoUpload({ onUpload }));
    expect(result.current.state).toBe('empty');
    expect(result.current.preview).toBeNull();
    expect(result.current.errorKey).toBeNull();
  });

  it('starts in `filled` when initialPhotoUrl is provided', () => {
    const onUpload = vi.fn();
    const { result } = renderHook(() =>
      usePhotoUpload({ onUpload, initialPhotoUrl: 'https://cdn/existing.png' })
    );
    expect(result.current.state).toBe('filled');
    expect(result.current.preview).toBeNull();
  });
});

describe('usePhotoUpload — client-side validation', () => {
  it('rejects unsupported mime types with `type` error and does not call onUpload', () => {
    const onUpload = vi.fn();
    const { result } = renderHook(() => usePhotoUpload({ onUpload }));

    act(() => {
      result.current.handleFileChange(
        makeChangeEvent(makeFile('avatar.gif', 'image/gif'))
      );
    });

    expect(onUpload).not.toHaveBeenCalled();
    expect(result.current.state).toBe('error');
    expect(result.current.errorKey).toBe('type');
    expect(result.current.preview).toBeNull();
  });

  it('rejects oversized files with `size` error and does not call onUpload', () => {
    const onUpload = vi.fn();
    const { result } = renderHook(() => usePhotoUpload({ onUpload }));

    act(() => {
      result.current.handleFileChange(makeChangeEvent(makeOversizedFile()));
    });

    expect(onUpload).not.toHaveBeenCalled();
    expect(result.current.state).toBe('error');
    expect(result.current.errorKey).toBe('size');
  });

  it('does nothing when no file is present on the change event', () => {
    const onUpload = vi.fn();
    const { result } = renderHook(() => usePhotoUpload({ onUpload }));
    act(() => {
      result.current.handleFileChange(makeChangeEvent(null));
    });
    expect(onUpload).not.toHaveBeenCalled();
    expect(result.current.state).toBe('empty');
  });
});

describe('usePhotoUpload — happy path', () => {
  it('sets preview, transitions to `uploading`, and calls onUpload with FormData', () => {
    let resolveUpload: (v: { avatarUrl: string }) => void = () => {};
    const uploadPromise = new Promise<{ avatarUrl: string }>((r) => {
      resolveUpload = r;
    });
    const onUpload = vi.fn().mockReturnValue(uploadPromise);
    const { result } = renderHook(() => usePhotoUpload({ onUpload }));

    const file = makeFile();
    act(() => {
      result.current.handleFileChange(makeChangeEvent(file));
    });

    expect(result.current.state).toBe('uploading');
    expect(result.current.preview).toBe(createdUrls[0]);
    expect(onUpload).toHaveBeenCalledTimes(1);
    const fd = onUpload.mock.calls[0][0] as FormData;
    expect(fd).toBeInstanceOf(FormData);
    expect(fd.get('file')).toBe(file);

    // Tidy: resolve so nothing leaks past the test.
    resolveUpload({ avatarUrl: 'https://cdn/x.png' });
  });

  it('transitions to `success` and fires onSuccess with the avatar URL', async () => {
    const onUpload = vi.fn().mockResolvedValue({ avatarUrl: 'https://cdn/x.png' });
    const onSuccess = vi.fn();

    const { result } = renderHook(() =>
      usePhotoUpload({ onUpload, onSuccess, minRingMs: 0, stoneBeatMs: 0 })
    );

    await act(async () => {
      result.current.handleFileChange(makeChangeEvent(makeFile()));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.state).toBe('success');
    expect(onSuccess).toHaveBeenCalledWith('https://cdn/x.png');
    expect(result.current.preview).toBe(createdUrls[0]);
  });

  it('clears any previous error when a new upload starts', async () => {
    const onUpload = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ avatarUrl: 'https://cdn/x.png' });
    const { result } = renderHook(() =>
      usePhotoUpload({ onUpload, minRingMs: 0, stoneBeatMs: 0 })
    );

    await act(async () => {
      result.current.handleFileChange(makeChangeEvent(makeFile()));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.errorKey).toBe('generic');

    await act(async () => {
      result.current.handleFileChange(makeChangeEvent(makeFile()));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.errorKey).toBeNull();
    expect(result.current.state).toBe('success');
  });
});

describe('usePhotoUpload — ring floor + stone beat timing', () => {
  it('holds `uploading` state until minRingMs has elapsed even when upload is faster', async () => {
    vi.useFakeTimers();
    const onUpload = vi.fn().mockResolvedValue({ avatarUrl: 'https://cdn/x.png' });
    const { result } = renderHook(() =>
      usePhotoUpload({ onUpload, minRingMs: 400, stoneBeatMs: 0 })
    );

    await act(async () => {
      result.current.handleFileChange(makeChangeEvent(makeFile()));
    });
    // Let the upload promise resolve (0ms elapsed, 400ms remaining).
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.state).toBe('uploading');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(result.current.state).toBe('success');
  });

  it('fires stone callback with `ready` on success and `null` after stoneBeatMs', async () => {
    vi.useFakeTimers();
    const onUpload = vi.fn().mockResolvedValue({ avatarUrl: 'https://cdn/x.png' });
    const onStoneStateChange = vi.fn();

    const { result } = renderHook(() =>
      usePhotoUpload({
        onUpload,
        onStoneStateChange,
        minRingMs: 0,
        stoneBeatMs: 1200,
      })
    );

    await act(async () => {
      result.current.handleFileChange(makeChangeEvent(makeFile()));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(onStoneStateChange).toHaveBeenNthCalledWith(1, 'ready');
    expect(onStoneStateChange).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1200);
    });
    expect(onStoneStateChange).toHaveBeenNthCalledWith(2, null);
  });
});

describe('usePhotoUpload — replace flow', () => {
  it('enters `replacing` (not `uploading`) when starting from `filled`', () => {
    let resolveUpload: (v: { avatarUrl: string }) => void = () => {};
    const onUpload = vi.fn().mockImplementation(
      () =>
        new Promise<{ avatarUrl: string }>((r) => {
          resolveUpload = r;
        })
    );
    const { result } = renderHook(() =>
      usePhotoUpload({
        onUpload,
        initialPhotoUrl: 'https://cdn/existing.png',
      })
    );
    expect(result.current.state).toBe('filled');

    act(() => {
      result.current.handleFileChange(makeChangeEvent(makeFile()));
    });

    expect(result.current.state).toBe('replacing');
    expect(result.current.preview).toBe(createdUrls[0]);

    resolveUpload({ avatarUrl: 'https://cdn/new.png' });
  });

  it('enters `replacing` when starting from `success`', async () => {
    const onUpload = vi
      .fn()
      .mockResolvedValue({ avatarUrl: 'https://cdn/x.png' });
    const { result } = renderHook(() =>
      usePhotoUpload({ onUpload, minRingMs: 0, stoneBeatMs: 0 })
    );

    await act(async () => {
      result.current.handleFileChange(makeChangeEvent(makeFile('a.png')));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.state).toBe('success');

    let resolveSecond: (v: { avatarUrl: string }) => void = () => {};
    onUpload.mockImplementationOnce(
      () =>
        new Promise<{ avatarUrl: string }>((r) => {
          resolveSecond = r;
        })
    );

    act(() => {
      result.current.handleFileChange(makeChangeEvent(makeFile('b.png')));
    });
    expect(result.current.state).toBe('replacing');
    resolveSecond({ avatarUrl: 'https://cdn/b.png' });
  });
});

describe('usePhotoUpload — error paths', () => {
  it('sets `generic` errorKey, clears preview, and revokes URL when onUpload throws', async () => {
    const onUpload = vi.fn().mockRejectedValue(new Error('Network down'));
    const { result } = renderHook(() =>
      usePhotoUpload({ onUpload, minRingMs: 0 })
    );

    await act(async () => {
      result.current.handleFileChange(makeChangeEvent(makeFile()));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.state).toBe('error');
    expect(result.current.errorKey).toBe('generic');
    expect(result.current.preview).toBeNull();
    expect(revokedUrls).toContain(createdUrls[0]);
  });

  it('resets the <input> value so the same file can be re-selected', () => {
    const onUpload = vi.fn();
    const { result } = renderHook(() => usePhotoUpload({ onUpload }));
    const evt = makeChangeEvent(makeFile('avatar.gif', 'image/gif'));
    act(() => {
      result.current.handleFileChange(evt);
    });
    expect((evt.target as unknown as { value: string }).value).toBe('');
  });
});

describe('usePhotoUpload — reset', () => {
  it('returns to `empty` when there was no initial photo', async () => {
    const onUpload = vi.fn().mockResolvedValue({ avatarUrl: 'https://cdn/x.png' });
    const { result } = renderHook(() =>
      usePhotoUpload({ onUpload, minRingMs: 0, stoneBeatMs: 0 })
    );

    await act(async () => {
      result.current.handleFileChange(makeChangeEvent(makeFile()));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.state).toBe('success');

    act(() => {
      result.current.reset();
    });

    expect(result.current.state).toBe('empty');
    expect(result.current.preview).toBeNull();
    expect(result.current.errorKey).toBeNull();
  });

  it('returns to `filled` when there was an initial photo', async () => {
    const onUpload = vi.fn().mockResolvedValue({ avatarUrl: 'https://cdn/x.png' });
    const { result } = renderHook(() =>
      usePhotoUpload({
        onUpload,
        initialPhotoUrl: 'https://cdn/existing.png',
        minRingMs: 0,
        stoneBeatMs: 0,
      })
    );

    await act(async () => {
      result.current.handleFileChange(makeChangeEvent(makeFile()));
      await Promise.resolve();
      await Promise.resolve();
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.state).toBe('filled');
  });
});

describe('usePhotoUpload — object URL lifecycle', () => {
  it('revokes the previous object URL when preview changes to a new file', async () => {
    const onUpload = vi.fn().mockResolvedValue({ avatarUrl: 'https://cdn/x' });
    const { result } = renderHook(() =>
      usePhotoUpload({ onUpload, minRingMs: 0, stoneBeatMs: 0 })
    );

    await act(async () => {
      result.current.handleFileChange(makeChangeEvent(makeFile('a.png')));
      await Promise.resolve();
      await Promise.resolve();
    });
    const firstUrl = createdUrls[0];

    await act(async () => {
      result.current.handleFileChange(makeChangeEvent(makeFile('b.png')));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(revokedUrls).toContain(firstUrl);
    expect(createdUrls[1]).not.toBe(firstUrl);
  });

  it('revokes the current object URL on unmount', async () => {
    const onUpload = vi.fn().mockResolvedValue({ avatarUrl: 'https://cdn/x' });
    const { result, unmount } = renderHook(() =>
      usePhotoUpload({ onUpload, minRingMs: 0, stoneBeatMs: 0 })
    );

    await act(async () => {
      result.current.handleFileChange(makeChangeEvent(makeFile()));
      await Promise.resolve();
      await Promise.resolve();
    });
    const url = createdUrls[0];
    expect(revokedUrls).not.toContain(url);

    unmount();
    expect(revokedUrls).toContain(url);
  });

  it('does not throw if unmount happens while an upload is in flight', async () => {
    let resolveUpload: (v: { avatarUrl: string }) => void = () => {};
    const uploadPromise = new Promise<{ avatarUrl: string }>((r) => {
      resolveUpload = r;
    });
    const onUpload = vi.fn().mockReturnValue(uploadPromise);

    const { result, unmount } = renderHook(() =>
      usePhotoUpload({ onUpload, minRingMs: 0, stoneBeatMs: 0 })
    );

    act(() => {
      result.current.handleFileChange(makeChangeEvent(makeFile()));
    });

    unmount();

    await act(async () => {
      resolveUpload({ avatarUrl: 'https://cdn/x' });
      await uploadPromise;
      await Promise.resolve();
    });

    expect(createdUrls).toHaveLength(1);
    expect(revokedUrls).toContain(createdUrls[0]);
  });

  it('releases the stone override on unmount if the beat is still in flight', async () => {
    vi.useFakeTimers();
    const onUpload = vi.fn().mockResolvedValue({ avatarUrl: 'https://cdn/x' });
    const onStoneStateChange = vi.fn();
    const { result, unmount } = renderHook(() =>
      usePhotoUpload({
        onUpload,
        onStoneStateChange,
        minRingMs: 0,
        stoneBeatMs: 1200,
      })
    );

    await act(async () => {
      result.current.handleFileChange(makeChangeEvent(makeFile()));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(onStoneStateChange).toHaveBeenLastCalledWith('ready');

    // Unmount BEFORE the beat timeout fires.
    unmount();
    expect(onStoneStateChange).toHaveBeenLastCalledWith(null);
  });
});
