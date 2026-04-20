'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import {
  AVATAR_ALLOWED_MIME,
  AVATAR_MAX_BYTES,
} from '@/lib/profile/avatar-shared';
import { ONBOARDING_TIMING } from '@/lib/config/onboarding-timing';

export type PhotoState =
  | 'empty'
  | 'uploading'
  | 'success'
  | 'filled'
  | 'error'
  | 'replacing';

export type PhotoErrorKey = 'generic' | 'type' | 'size';

export type StoneBeatSignal = 'ready' | null;

interface UsePhotoUploadOptions {
  /** Existing avatar URL on mount. Drives initial `filled` vs `empty`. */
  initialPhotoUrl?: string | null;
  /** Server action: throws on failure, resolves with { avatarUrl } on success. */
  onUpload: (formData: FormData) => Promise<{ avatarUrl: string }>;
  /** Called with the new avatarUrl (or null) after a successful upload. */
  onSuccess?: (avatarUrl: string | null) => void;
  /** `'ready'` on success (drives the 1200ms stone beat), `null` to release. */
  onStoneStateChange?: (state: StoneBeatSignal) => void;
  /** Minimum ring visibility in ms. Prevents flashing on fast uploads. */
  minRingMs?: number;
  /** How long the stone holds `ready` after success. */
  stoneBeatMs?: number;
}

interface UsePhotoUploadResult {
  state: PhotoState;
  preview: string | null;
  errorKey: PhotoErrorKey | null;
  handleFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  reset: () => void;
}

function validatePhotoFile(
  file: File
): { ok: true } | { ok: false; reason: 'type' | 'size' } {
  const allowed = AVATAR_ALLOWED_MIME as readonly string[];
  if (!allowed.includes(file.type)) return { ok: false, reason: 'type' };
  if (file.size > AVATAR_MAX_BYTES) return { ok: false, reason: 'size' };
  return { ok: true };
}

export function usePhotoUpload({
  initialPhotoUrl = null,
  onUpload,
  onSuccess,
  onStoneStateChange,
  minRingMs = ONBOARDING_TIMING.PHOTO_MIN_RING_MS,
  stoneBeatMs = ONBOARDING_TIMING.PHOTO_STONE_BEAT_MS,
}: UsePhotoUploadOptions): UsePhotoUploadResult {
  const [state, setState] = useState<PhotoState>(
    initialPhotoUrl ? 'filled' : 'empty'
  );
  const [preview, setPreview] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<PhotoErrorKey | null>(null);

  const mountedRef = useRef(true);
  const stoneTimeoutRef = useRef<number | null>(null);
  const stoneCallbackRef = useRef<typeof onStoneStateChange>(onStoneStateChange);

  useEffect(() => {
    stoneCallbackRef.current = onStoneStateChange;
  }, [onStoneStateChange]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (stoneTimeoutRef.current != null) {
        window.clearTimeout(stoneTimeoutRef.current);
        stoneTimeoutRef.current = null;
        stoneCallbackRef.current?.(null);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleFile = useCallback(
    async (file: File) => {
      const validation = validatePhotoFile(file);
      if (!validation.ok) {
        setErrorKey(validation.reason);
        setState('error');
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      setErrorKey(null);

      const isReplacing =
        state === 'success' || state === 'filled' || state === 'replacing';
      setState(isReplacing ? 'replacing' : 'uploading');

      const startTime = Date.now();

      try {
        const formData = new FormData();
        formData.append('file', file);
        const { avatarUrl } = await onUpload(formData);

        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, minRingMs - elapsed);
        if (remaining > 0) {
          await new Promise((r) => setTimeout(r, remaining));
        }

        if (!mountedRef.current) return;

        setState('success');
        onSuccess?.(avatarUrl ?? null);

        stoneCallbackRef.current?.('ready');
        if (stoneTimeoutRef.current != null) {
          window.clearTimeout(stoneTimeoutRef.current);
        }
        stoneTimeoutRef.current = window.setTimeout(() => {
          stoneTimeoutRef.current = null;
          if (mountedRef.current) stoneCallbackRef.current?.(null);
        }, stoneBeatMs);
      } catch {
        if (!mountedRef.current) return;
        URL.revokeObjectURL(objectUrl);
        setPreview(null);
        setErrorKey('generic');
        setState('error');
      }
    },
    [state, onUpload, onSuccess, minRingMs, stoneBeatMs]
  );

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void handleFile(file);
      e.target.value = '';
    },
    [handleFile]
  );

  const reset = useCallback(() => {
    setPreview(null);
    setErrorKey(null);
    setState(initialPhotoUrl ? 'filled' : 'empty');
  }, [initialPhotoUrl]);

  return { state, preview, errorKey, handleFileChange, reset };
}
