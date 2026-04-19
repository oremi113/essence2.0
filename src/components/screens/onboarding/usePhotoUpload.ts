'use client';

import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
} from 'react';

interface UsePhotoUploadOptions {
  onUpload: (
    formData: FormData
  ) => Promise<{ avatarUrl?: string; error?: string }>;
  onSuccess?: (avatarUrl: string | null) => void;
}

interface UsePhotoUploadResult {
  preview: string | null;
  isUploading: boolean;
  error: string | null;
  handleFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  reset: () => void;
}

export function usePhotoUpload({
  onUpload,
  onSuccess,
}: UsePhotoUploadOptions): UsePhotoUploadResult {
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        const { avatarUrl: nextUrl } = await onUpload(formData);
        onSuccess?.(nextUrl ?? null);
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        setPreview(null);
        setError(err instanceof Error ? err.message : 'Upload failed.');
      } finally {
        setIsUploading(false);
      }
    },
    [onUpload, onSuccess]
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
    setError(null);
    setIsUploading(false);
  }, []);

  return { preview, isUploading, error, handleFileChange, reset };
}
