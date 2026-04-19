import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ChangeEvent } from 'react';
import { usePhotoUpload } from '@/components/screens/onboarding/usePhotoUpload';

/**
 * Unit tests for usePhotoUpload.
 *
 * Covers initial state, file-change happy path, error path via thrown
 * onUpload, reset, object-URL lifecycle, and that unmounting during an
 * in-flight upload is safe (no thrown errors, no unhandled rejections).
 */

// ----- helpers -------------------------------------------------------------

let urlCounter = 0;
const createdUrls: string[] = [];
const revokedUrls: string[] = [];

function makeFile(name = 'avatar.png', type = 'image/png') {
  return new File([new Uint8Array([1, 2, 3, 4])], name, { type });
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
});

// ----- tests ---------------------------------------------------------------

describe('usePhotoUpload — initial state', () => {
  it('starts idle with no preview, no error, not uploading', () => {
    const onUpload = vi.fn().mockResolvedValue({ avatarUrl: null });
    const { result } = renderHook(() => usePhotoUpload({ onUpload }));
    expect(result.current.preview).toBeNull();
    expect(result.current.isUploading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.handleFileChange).toBe('function');
    expect(typeof result.current.reset).toBe('function');
  });
});

describe('usePhotoUpload — handleFileChange happy path', () => {
  it('sets preview, toggles isUploading, and calls onUpload with FormData', async () => {
    let resolveUpload: (v: { avatarUrl?: string; error?: string }) => void = () => {};
    const uploadPromise = new Promise<{ avatarUrl?: string; error?: string }>((r) => {
      resolveUpload = r;
    });
    const onUpload = vi.fn().mockReturnValue(uploadPromise);
    const onSuccess = vi.fn();

    const { result } = renderHook(() => usePhotoUpload({ onUpload, onSuccess }));

    const file = makeFile();

    // Kick off the change inside act so preview state is committed.
    act(() => {
      result.current.handleFileChange(makeChangeEvent(file));
    });

    // Preview set synchronously; upload in flight.
    expect(result.current.preview).toBe(createdUrls[0]);
    expect(result.current.isUploading).toBe(true);
    expect(onUpload).toHaveBeenCalledTimes(1);

    const fd = onUpload.mock.calls[0][0] as FormData;
    expect(fd).toBeInstanceOf(FormData);
    expect(fd.get('file')).toBe(file);

    // Resolve the upload.
    await act(async () => {
      resolveUpload({ avatarUrl: 'https://cdn/x.png' });
      await uploadPromise;
    });

    expect(result.current.isUploading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith('https://cdn/x.png');
    // Preview is preserved on success.
    expect(result.current.preview).toBe(createdUrls[0]);
  });

  it('calls onSuccess with null when onUpload resolves without avatarUrl', async () => {
    const onUpload = vi.fn().mockResolvedValue({});
    const onSuccess = vi.fn();
    const { result } = renderHook(() => usePhotoUpload({ onUpload, onSuccess }));

    await act(async () => {
      result.current.handleFileChange(makeChangeEvent(makeFile()));
      // Let the resolved promise settle.
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(onSuccess).toHaveBeenCalledWith(null);
    expect(result.current.isUploading).toBe(false);
  });

  it('does nothing when no file is present on the change event', () => {
    const onUpload = vi.fn();
    const { result } = renderHook(() => usePhotoUpload({ onUpload }));
    act(() => {
      result.current.handleFileChange(makeChangeEvent(null));
    });
    expect(onUpload).not.toHaveBeenCalled();
    expect(result.current.preview).toBeNull();
    expect(result.current.isUploading).toBe(false);
  });

  it('resets the <input> value so the same file can be re-selected', () => {
    const onUpload = vi.fn().mockResolvedValue({});
    const { result } = renderHook(() => usePhotoUpload({ onUpload }));
    const evt = makeChangeEvent(makeFile());
    act(() => {
      result.current.handleFileChange(evt);
    });
    // Hook assigns '' to the input so the onChange fires again next time.
    expect((evt.target as unknown as { value: string }).value).toBe('');
  });
});

describe('usePhotoUpload — error paths', () => {
  it('populates error, clears preview, and revokes URL when onUpload throws', async () => {
    const onUpload = vi.fn().mockRejectedValue(new Error('Network down'));
    const onSuccess = vi.fn();
    const { result } = renderHook(() => usePhotoUpload({ onUpload, onSuccess }));

    await act(async () => {
      result.current.handleFileChange(makeChangeEvent(makeFile()));
      // let microtasks flush
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.error).toBe('Network down');
    expect(result.current.isUploading).toBe(false);
    expect(result.current.preview).toBeNull();
    expect(onSuccess).not.toHaveBeenCalled();
    // URL for the just-cleared preview was revoked.
    expect(revokedUrls).toContain(createdUrls[0]);
  });

  it('uses a generic message when the thrown value is not an Error', async () => {
    const onUpload = vi.fn().mockRejectedValue('nope');
    const { result } = renderHook(() => usePhotoUpload({ onUpload }));
    await act(async () => {
      result.current.handleFileChange(makeChangeEvent(makeFile()));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.error).toBe('Upload failed.');
  });

  // Documents *current* behavior for onUpload resolving with { error }: the
  // hook destructures only avatarUrl, so the returned error is NOT surfaced
  // in state and onSuccess(null) is still called. Flagged in the PR body.
  it('does not currently surface a returned { error } into hook state', async () => {
    const onUpload = vi
      .fn()
      .mockResolvedValue({ error: 'file too large' });
    const onSuccess = vi.fn();
    const { result } = renderHook(() => usePhotoUpload({ onUpload, onSuccess }));

    await act(async () => {
      result.current.handleFileChange(makeChangeEvent(makeFile()));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.isUploading).toBe(false);
    expect(result.current.preview).toBe(createdUrls[0]);
    expect(onSuccess).toHaveBeenCalledWith(null);
  });
});

describe('usePhotoUpload — reset', () => {
  it('clears preview, error, and isUploading', async () => {
    const onUpload = vi.fn().mockResolvedValue({ avatarUrl: 'https://cdn/x' });
    const { result } = renderHook(() => usePhotoUpload({ onUpload }));

    await act(async () => {
      result.current.handleFileChange(makeChangeEvent(makeFile()));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.preview).toBe(createdUrls[0]);

    act(() => {
      result.current.reset();
    });

    expect(result.current.preview).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isUploading).toBe(false);
  });

  it('triggers the effect-cleanup revocation when reset nulls preview', async () => {
    const onUpload = vi.fn().mockResolvedValue({ avatarUrl: 'https://cdn/x' });
    const { result } = renderHook(() => usePhotoUpload({ onUpload }));
    await act(async () => {
      result.current.handleFileChange(makeChangeEvent(makeFile()));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(revokedUrls).not.toContain(createdUrls[0]);

    act(() => {
      result.current.reset();
    });

    expect(revokedUrls).toContain(createdUrls[0]);
  });
});

describe('usePhotoUpload — object URL lifecycle', () => {
  it('revokes the previous object URL when preview changes to a new file', async () => {
    const onUpload = vi.fn().mockResolvedValue({ avatarUrl: 'https://cdn/x' });
    const { result } = renderHook(() => usePhotoUpload({ onUpload }));

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
    const secondUrl = createdUrls[1];

    // First URL is revoked when preview switches to the second.
    expect(revokedUrls).toContain(firstUrl);
    expect(secondUrl).not.toBe(firstUrl);
  });

  it('revokes the current object URL on unmount', async () => {
    const onUpload = vi.fn().mockResolvedValue({ avatarUrl: 'https://cdn/x' });
    const { result, unmount } = renderHook(() => usePhotoUpload({ onUpload }));
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
    let resolveUpload: (v: { avatarUrl?: string }) => void = () => {};
    const uploadPromise = new Promise<{ avatarUrl?: string }>((r) => {
      resolveUpload = r;
    });
    const onUpload = vi.fn().mockReturnValue(uploadPromise);

    const { result, unmount } = renderHook(() => usePhotoUpload({ onUpload }));

    act(() => {
      result.current.handleFileChange(makeChangeEvent(makeFile()));
    });

    // Unmount before the upload resolves.
    unmount();

    // Now resolve. No thrown errors / unhandled rejections expected.
    await act(async () => {
      resolveUpload({ avatarUrl: 'https://cdn/x' });
      await uploadPromise;
      await Promise.resolve();
    });

    // If we got here without throwing, the hook handled post-unmount settling.
    expect(createdUrls).toHaveLength(1);
    expect(revokedUrls).toContain(createdUrls[0]);
  });
});
