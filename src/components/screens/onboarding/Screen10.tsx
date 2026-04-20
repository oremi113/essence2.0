'use client';

import { useRef } from 'react';
import { PrimaryButton } from '@/components/ui';
import type { BreathStoneState } from '@/components/breath-stone';
import type { OnUploadAvatar } from '../OnboardingScreen.types';
import { StepShell, StoneSlot } from './chrome';
import {
  usePhotoUpload,
  type PhotoErrorKey,
  type PhotoState,
} from './usePhotoUpload';

// ─── SCREEN 10 — Photo upload ─────────────────────────────────────
//
// Single-commit flow: tap the circle → native picker → upload →
// photo fills the circle → stone beats `ready` → CTA swaps to
// "Continue." No confirm step, no phantom "Save photo" commit.
//
// The stone override flows up to OnboardingScreen's PersistentStone
// via `onStoneStateChange`; the hook holds the 1200ms beat timer and
// releases to `null` (or on unmount, belt-and-suspenders).

const ERROR_COPY: Record<PhotoErrorKey, string> = {
  generic:
    "That photo didn't come through. Try another, or continue without one.",
  type: 'We can hold JPG, PNG, or WebP photos. Try another, or continue without one.',
  size: 'That photo is a bit large. Try a smaller one, or continue without one.',
};

function isUploadInFlight(state: PhotoState): boolean {
  return state === 'uploading' || state === 'replacing';
}

function hasPhotoVisible(
  state: PhotoState,
  preview: string | null,
  avatarUrl: string | null
): boolean {
  return Boolean(preview ?? avatarUrl) && state !== 'error';
}

export function Screen10Photo({
  avatarUrl,
  onUpload,
  onAvatarChange,
  onStoneStateChange,
  onNext,
}: {
  avatarUrl: string | null;
  onUpload: OnUploadAvatar;
  onAvatarChange: (url: string | null) => void;
  onStoneStateChange: (state: BreathStoneState | null) => void;
  onNext: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { state, preview, errorKey, handleFileChange } = usePhotoUpload({
    initialPhotoUrl: avatarUrl,
    onUpload,
    onSuccess: onAvatarChange,
    onStoneStateChange,
  });

  const displayUrl = preview ?? avatarUrl;
  const inFlight = isUploadInFlight(state);
  const photoVisible = hasPhotoVisible(state, preview, avatarUrl);

  const ctaLabel =
    state === 'success' || state === 'filled' || state === 'replacing'
      ? 'Continue'
      : 'Continue without photo';

  const circleAriaLabel = photoVisible
    ? 'Profile photo. Tap Replace to change.'
    : 'Add a photo';

  const handleReplace = () => {
    fileInputRef.current?.click();
  };

  return (
    <StepShell>
      <StoneSlot />

      <h1 className="onboarding-title">Add a photo if you&rsquo;d like.</h1>
      <p className="onboarding-subtitle">
        It helps your messages feel more personal. Completely optional.
      </p>

      <div className="onboarding-photo-wrapper">
        <label
          className={[
            'onboarding-photo',
            inFlight ? 'onboarding-photo--uploading' : '',
            photoVisible ? 'onboarding-photo--filled' : '',
            state === 'replacing' ? 'onboarding-photo--replacing' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          htmlFor="onboarding-photo-input"
          aria-label={circleAriaLabel}
        >
          <input
            ref={fileInputRef}
            id="onboarding-photo-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="onboarding-photo__input"
            onChange={handleFileChange}
            disabled={inFlight}
          />

          {state === 'empty' || state === 'error' ? (
            <span className="onboarding-photo__label">Add a photo</span>
          ) : null}

          {displayUrl && photoVisible && (
            // alt is decorative — the label above announces role.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayUrl}
              alt=""
              className="onboarding-photo__img"
              style={state === 'replacing' ? { opacity: 0.4 } : undefined}
            />
          )}

          {inFlight && (
            <span className="onboarding-photo__ring" aria-hidden="true" />
          )}
        </label>

        {(state === 'success' || state === 'filled') && (
          <button
            type="button"
            className="onboarding-photo__replace"
            onClick={handleReplace}
          >
            Replace
          </button>
        )}

        {state === 'success' && (
          <p className="onboarding-photo-confirmation onboarding-photo-confirmation--visible">
            Looking good
          </p>
        )}

        {state === 'error' && errorKey && (
          <p className="onboarding-photo-error" role="alert">
            {ERROR_COPY[errorKey]}
          </p>
        )}

        <p className="sr-only" role="status" aria-live="polite">
          {state === 'success' ? 'Profile photo added.' : ''}
        </p>
      </div>

      <div className="onboarding-ctas">
        <PrimaryButton onClick={onNext} disabled={inFlight}>
          {ctaLabel}
        </PrimaryButton>
      </div>
    </StepShell>
  );
}
