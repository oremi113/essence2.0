'use client';

import { useCallback, useState } from 'react';
import { PrimaryButton } from '@/components/ui';
import { ClockIcon } from '@/components/icons';
import { ONBOARDING_TIMING } from '@/lib/config/onboarding-timing';
import { StepShell, StoneSlot } from './chrome';

// ─── SCREEN 6 — How this works (journey + time badge) ─────────────

export function Screen6({ onNext }: { onNext: () => void }) {
  // Phase-transition choreography to Screen 7 — see DESIGN BRIEF 002.
  //   0ms                        tap → haptic + button depress (scale 0.97)
  //   SCREEN6_PRESS_RELEASE_MS   release, begin step exit (fade to 85%, drift left 12px)
  //   SCREEN6_ADVANCE_MS         call onNext → Screen 7 mounts with phase-enter animation
  const [pressing, setPressing] = useState(false);
  const [exiting, setExiting] = useState(false);

  const handleBegin = useCallback(() => {
    if (exiting) return;
    // Light haptic — silently no-ops on desktop/iOS Safari.
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate?.(8);
    }
    setPressing(true);
    window.setTimeout(() => {
      setPressing(false);
      setExiting(true);
    }, ONBOARDING_TIMING.SCREEN6_PRESS_RELEASE_MS);
    window.setTimeout(() => {
      onNext();
    }, ONBOARDING_TIMING.SCREEN6_ADVANCE_MS);
  }, [exiting, onNext]);

  return (
    <div className={exiting ? 'onboarding-screen--exiting-phase' : ''}>
    <StepShell>
      <StoneSlot />

      <h1 className="onboarding-title">Here&rsquo;s how this works.</h1>

      <ol className="onboarding-journey">
        <li className="onboarding-journey__item onboarding-journey__item--current">
          <span className="onboarding-journey__num" aria-hidden="true">1</span>
          <span className="onboarding-journey__text">
            <span className="onboarding-journey__label">Make your profile</span>
            <span className="onboarding-journey__duration">Less than 1 minute</span>
          </span>
        </li>
        <li className="onboarding-journey__item">
          <span className="onboarding-journey__num" aria-hidden="true">2</span>
          <span className="onboarding-journey__text">
            <span className="onboarding-journey__label">Record your voice</span>
            <span className="onboarding-journey__duration">10 to 13 minutes</span>
          </span>
        </li>
        <li className="onboarding-journey__item">
          <span className="onboarding-journey__num" aria-hidden="true">3</span>
          <span className="onboarding-journey__text">
            <span className="onboarding-journey__label">Create your first message</span>
            <span className="onboarding-journey__duration">About 2 minutes</span>
          </span>
        </li>
      </ol>

      <div className="onboarding-total-time">
        <span className="onboarding-total-time__left">
          <ClockIcon />
          Total time
        </span>
        <span className="onboarding-total-time__value">About 15 minutes</span>
      </div>

      <div className="onboarding-body">
        <p className="onboarding-body__muted">
          Most people finish in one sitting. You can also pause and return anytime.
        </p>
      </div>

      <div className="onboarding-ctas">
        <PrimaryButton
          onClick={handleBegin}
          disabled={exiting}
          className={pressing ? 'onboarding-btn-pressing' : ''}
        >
          Let&rsquo;s begin
        </PrimaryButton>
      </div>
    </StepShell>
    </div>
  );
}
