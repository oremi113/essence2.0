'use client';

import { useCallback, useState } from 'react';
import type { BreathStoneState } from '@/components/breath-stone';
import type {
  OnboardingScreenData,
  OnCompleteOnboarding,
  OnUploadAvatar,
} from './OnboardingScreen.types';
import {
  BackButton,
  PersistentStone,
  ProgressDots,
  SCREEN_CONFIG,
  TOTAL_SCREENS,
} from './onboarding/chrome';
import { PrivacyPromiseModal } from './onboarding/PrivacyPromiseModal';
import {
  Screen1, Screen2, Screen3, Screen4, Screen5, Screen6,
  Screen7, Screen8, Screen9Review, Screen10Photo,
  Screen11Priming, Screen12Ready,
} from './onboarding/screens';
import { clearDraft, useOnboardingForm } from './onboarding/state';

// ═══════════════════════════════════════════════════════════════════════════
//  ESSENCE — Onboarding (12-screen wizard)
//
//  Flow:
//    1  Welcome (cinematic intro)
//    2  Purpose
//    3  Who this is for
//    4  Safety & trust  (opens Privacy Promise sheet)
//    5  Why your voice matters
//    6  How this works (journey + time badge)
//    7  Identity setup intro  (PHASE TRANSITION — bg cream → warm-phase oat)
//    8  About you (name + DOB + city/state form card)
//    9  Review (verify captured data; "Change" jumps back to 8)
//   10  Photo upload (real Storage upload)
//   11  Priming moment (3500ms button unlock)
//   12  Ready to begin
//
//  On screen 12 we call `onComplete(...)` — the caller persists to
//  Supabase and navigates to /app/record. This component never touches
//  the network directly. The Screen 10 photo upload runs out-of-band
//  via `onUploadAvatar` (also injected by the caller).
//
//  Sub-modules:
//    - state.ts  — reducer + draft persistence + useOnboardingForm hook
//    - chrome.tsx — ProgressDots, BackButton, PersistentStone, StepShell,
//                   StoneSlot, SCREEN_CONFIG, TOTAL_SCREENS
//    - screens.tsx — all 12 sub-screens
//    - PrivacyPromiseModal.tsx — bottom sheet opened from Screen 4
// ═══════════════════════════════════════════════════════════════════════════

interface OnboardingScreenProps {
  data: OnboardingScreenData;
  onComplete: OnCompleteOnboarding;
  onUploadAvatar: OnUploadAvatar;
}

export function OnboardingScreen({
  data,
  onComplete,
  onUploadAvatar,
}: OnboardingScreenProps) {
  const { form, currentScreen, setCurrentScreen, setField, setAvatarUrl } =
    useOnboardingForm({
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: data.dateOfBirth,
      city: data.city,
      state: data.state,
      avatarUrl: data.avatarUrl,
    });

  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // User-facing message when the final save fails. The completion action now
  // throws loudly on a write error or lost session (FOLLOW_UPS #42) instead of
  // navigating away on a silent failure; this surfaces that to the user so they
  // can retry in place rather than watch the button re-enable with no feedback.
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  // Short-lived override for the persistent stone. Screens (today: 10)
  // can push `'ready'` to acknowledge an in-screen action and release
  // with `null` to fall back to SCREEN_CONFIG. The screen wrapper below
  // uses `key={currentScreen}`, so Screen 10 unmounts on navigation
  // and its hook releases the override in cleanup — no belt-and-
  // suspenders effect needed here.
  const [stoneOverride, setStoneOverride] = useState<BreathStoneState | null>(
    null
  );

  // ─── Navigation ────────────────────────────────────────────
  const goNext = useCallback(() => {
    setDirection('forward');
    setCurrentScreen((s) => Math.min(TOTAL_SCREENS, s + 1));
  }, [setCurrentScreen]);

  const goBack = useCallback(() => {
    setDirection('back');
    setCurrentScreen((s) => Math.max(1, s - 1));
  }, [setCurrentScreen]);

  // Jump to a specific screen with correct directional animation.
  // Used by the "Change" link on Screen 9 to return to Screen 8.
  const goTo = useCallback(
    (target: number) => {
      setCurrentScreen((prev) => {
        setDirection(target >= prev ? 'forward' : 'back');
        return Math.min(TOTAL_SCREENS, Math.max(1, target));
      });
    },
    [setCurrentScreen]
  );

  // ─── Completion ────────────────────────────────────────────
  const handleComplete = useCallback(async () => {
    if (isSubmitting) return;
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await onComplete(
        form.firstName.trim(),
        form.lastName.trim(),
        form.dob,
        form.city.trim(),
        form.stateCode
      );
      clearDraft();
      // Caller navigates. If it doesn't, we stay on screen 12.
    } catch (err) {
      console.error('[OnboardingScreen] onComplete failed:', err);
      // The draft is never cleared on failure and the form state persists, so
      // every answer is intact for an in-place retry. Session loss needs a
      // re-sign-in (a retry would just fail again); everything else is a
      // transient save error the user can retry by tapping Begin again.
      const message = err instanceof Error ? err.message : '';
      const isSessionLoss = /sign in|session expired/i.test(message);
      setSubmitError(
        isSessionLoss
          ? 'Your session timed out. Please refresh and sign in again — your answers are saved on this device.'
          : 'Something kept us from saving just now. Your answers are safe — tap Begin to try again.'
      );
      setIsSubmitting(false);
    }
  }, [isSubmitting, onComplete, form]);

  // ─── Render ────────────────────────────────────────────────
  const bg = SCREEN_CONFIG[currentScreen]?.bg ?? 'neutral';
  const wrapperClass = `onboarding-wrapper onboarding-bg-${bg}`;
  // Screen 7 entering forward uses a bespoke enter animation (stone leads
  // headline by 80ms, softer 380ms ease-out) to pair with Screen 6's
  // 250ms exit and the 600ms background warming — see DESIGN BRIEF 002.
  const isPhaseEnter = direction === 'forward' && currentScreen === 7;
  const slideClass = isPhaseEnter
    ? 'onboarding-slide-phase-enter'
    : direction === 'forward'
      ? 'onboarding-slide-forward'
      : 'onboarding-slide-back';

  return (
    <div className={wrapperClass}>
      <ProgressDots current={currentScreen} />
      <BackButton visible={currentScreen > 1} onBack={goBack} disabled={isSubmitting} />
      <PersistentStone currentScreen={currentScreen} override={stoneOverride} />

      {/* Keyed wrapper: force remount on screen change so the slide
          animation replays and sub-screen `useEffect` timers reset
          (e.g. screen 11's 3500ms priming lock). */}
      <div key={currentScreen} className={`onboarding-screen ${slideClass}`}>
        {currentScreen === 1 && <Screen1 onNext={goNext} />}
        {currentScreen === 2 && <Screen2 onNext={goNext} />}
        {currentScreen === 3 && <Screen3 onNext={goNext} />}
        {currentScreen === 4 && (
          <Screen4
            onNext={goNext}
            onReadPrivacy={() => setPrivacyOpen(true)}
          />
        )}
        {currentScreen === 5 && <Screen5 onNext={goNext} />}
        {currentScreen === 6 && <Screen6 onNext={goNext} />}
        {currentScreen === 7 && <Screen7 onNext={goNext} />}
        {currentScreen === 8 && (
          <Screen8 form={form} onChange={setField} onNext={goNext} />
        )}
        {currentScreen === 9 && (
          <Screen9Review
            form={form}
            onEdit={() => goTo(8)}
            onNext={goNext}
          />
        )}
        {currentScreen === 10 && (
          <Screen10Photo
            avatarUrl={form.avatarUrl}
            onUpload={onUploadAvatar}
            onAvatarChange={setAvatarUrl}
            onStoneStateChange={setStoneOverride}
            onNext={goNext}
          />
        )}
        {currentScreen === 11 && <Screen11Priming onNext={goNext} />}
        {currentScreen === 12 && (
          <Screen12Ready
            onBegin={handleComplete}
            isSubmitting={isSubmitting}
            error={submitError}
          />
        )}
      </div>

      {privacyOpen && (
        <PrivacyPromiseModal onClose={() => setPrivacyOpen(false)} />
      )}
    </div>
  );
}

export default OnboardingScreen;
