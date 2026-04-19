'use client';

import { PrimaryButton } from '@/components/ui';
import { StepShell, StoneSlot } from './chrome';
import type { ProfileFormState } from './state';

// ─── SCREEN 9 — Review ────────────────────────────────────────────

export function Screen9Review({
  form,
  onEdit,
  onNext,
}: {
  form: ProfileFormState;
  onEdit: () => void;
  onNext: () => void;
}) {
  const { firstName, lastName, dob, city, stateCode, avatarUrl } = form;
  const dobDisplay = /^\d{4}-\d{2}-\d{2}$/.test(dob)
    ? `${parseInt(dob.slice(5, 7), 10)}/${parseInt(dob.slice(8, 10), 10)}/${dob.slice(0, 4)}`
    : '—';
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || '—';
  const location =
    city && stateCode ? `${city}, ${stateCode}` : city || stateCode || '—';

  return (
    <StepShell>
      <StoneSlot />

      <h1 className="onboarding-title">Does this look right?</h1>
      <p className="onboarding-subtitle">
        We&apos;ll use this to personalize your recording.
      </p>

      <div className="onboarding-review-card">
        {avatarUrl && (
          <div className="onboarding-review-card__avatar">
            {/* Signed URL is short-lived (1h) and re-minted on /onboarding load. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatarUrl} alt="Your profile photo" />
          </div>
        )}
        <div className="onboarding-review-row">
          <div className="onboarding-review-row__label">Name</div>
          <div className="onboarding-review-row__value">{fullName}</div>
        </div>
        <div className="onboarding-review-row">
          <div className="onboarding-review-row__label">Date of birth</div>
          <div className="onboarding-review-row__value">{dobDisplay}</div>
        </div>
        <div className="onboarding-review-row">
          <div className="onboarding-review-row__label">Location</div>
          <div className="onboarding-review-row__value">{location}</div>
        </div>
        <button
          type="button"
          className="onboarding-review-card__edit"
          onClick={onEdit}
        >
          Change
        </button>
      </div>

      <div className="onboarding-ctas">
        <PrimaryButton onClick={onNext}>Looks good</PrimaryButton>
      </div>
    </StepShell>
  );
}
