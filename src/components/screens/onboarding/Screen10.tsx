'use client';

import { useCallback, useRef } from 'react';
import { PrimaryButton, LinkButton } from '@/components/ui';
import { CameraIcon } from '@/components/icons';
import type { OnUploadAvatar } from '../OnboardingScreen.types';
import { StepShell, StoneSlot } from './chrome';
import { usePhotoUpload } from './usePhotoUpload';

// ─── SCREEN 10 — Photo upload ─────────────────────────────────────

export function Screen10Photo({
  avatarUrl,
  onUpload,
  onAvatarChange,
  onNext,
}: {
  avatarUrl: string | null;
  onUpload: OnUploadAvatar;
  onAvatarChange: (url: string | null) => void;
  onNext: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { preview, isUploading, error, handleFileChange } = usePhotoUpload({
    onUpload,
    onSuccess: onAvatarChange,
  });

  const hasPhoto = Boolean(avatarUrl ?? preview);
  const displayUrl = preview ?? avatarUrl;

  const handlePickFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <StepShell>
      <StoneSlot />

      <h1 className="onboarding-title">Add a photo if you&apos;d like.</h1>
      <p className="onboarding-subtitle">
        It helps your messages feel more personal. Completely optional.
      </p>

      <button
        type="button"
        className={`onboarding-photo ${hasPhoto ? 'onboarding-photo--filled' : ''}`}
        onClick={handlePickFile}
        aria-label={hasPhoto ? 'Replace photo' : 'Add photo'}
        disabled={isUploading}
        style={
          displayUrl
            ? {
                backgroundImage: `url(${displayUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : undefined
        }
      >
        {!hasPhoto && (
          <>
            <CameraIcon size={32} />
            <span className="onboarding-photo__label">Tap to add</span>
          </>
        )}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      <p
        className={`onboarding-photo-confirmation ${hasPhoto && !isUploading && !error ? 'onboarding-photo-confirmation--visible' : ''}`}
      >
        {isUploading ? 'Uploading…' : 'Looking good ✓'}
      </p>

      {error && (
        <p className="onboarding-photo-error" role="alert">
          {error}
        </p>
      )}

      <div className="onboarding-ctas">
        <PrimaryButton onClick={onNext} disabled={isUploading}>
          {hasPhoto ? 'Save photo' : 'Continue without photo'}
        </PrimaryButton>
        {hasPhoto && (
          <LinkButton onClick={onNext} disabled={isUploading}>
            Continue without photo
          </LinkButton>
        )}
      </div>
    </StepShell>
  );
}
