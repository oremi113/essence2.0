'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { BreathStone, type BreathStoneState } from '@/components/breath-stone';
import { PrimaryButton, LinkButton } from '@/components/ui';
import { US_STATES } from '@/lib/us-states';
import {
  CameraIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  CloseIcon,
  ShieldIcon,
} from '@/components/icons';
import type {
  OnboardingScreenData,
  OnCompleteOnboarding,
} from './OnboardingScreen.types';

// ═══════════════════════════════════════════════════════════════════════════
//  ESSENCE — Onboarding (11-screen wizard, Session 4 rebuild)
//
//  Flow:
//    1  Welcome (cinematic intro)
//    2  Purpose
//    3  Who this is for
//    4  Safety & trust
//    5  Why your voice matters
//    6  How this works (journey + time badge)
//    7  Identity setup intro
//    8  About you (name + DOB + city/state form card)
//    9  Review (verify captured data; "Change" jumps back to 8)
//   10  Photo upload (UI-only; hasPhoto boolean)
//   11  Priming moment (3500ms button unlock)
//   12  Ready to begin
//
//  On screen 12 we call `onComplete(...)` — the caller persists to
//  Supabase and navigates to /app/record. This component never touches
//  the network directly.
// ═══════════════════════════════════════════════════════════════════════════

const TOTAL_SCREENS = 12;

type BgKey = 'neutral' | 'warm-phase' | 'warm-1' | 'warm-2' | 'gold' | 'rich';

/**
 * Single background across the entire onboarding. The BreathStone carries
 * all the visual warmth and emotional cue — the frame stays quiet so the
 * content reads cleanly and the stone remains the sole source of movement
 * and color. If we ever want a deliberate two-phase shift (cool for
 * orientation screens 1-6, warm for personal setup 7-12), re-assign the
 * values below — the CSS and wrapper plumbing already support all 5 tones.
 */
// Per-screen configuration. The stone is a continuous companion across
// the entire onboarding — it never unmounts between screens; only its
// animation state changes. Background phase shifts from cream (1–6) to
// warm-phase oat (7–12) when setCurrentScreen flips to 7, choreographed
// with the exit/enter animation. settleDelay is the ms delay before the
// stone promotes to its non-idle target; screen 11's priming uses 600ms
// to read as deliberate, others default to 500ms.
interface ScreenConfig {
  stone: BreathStoneState;
  bg: BgKey;
  settleDelay?: number;
}

const SCREEN_CONFIG: Record<number, ScreenConfig> = {
  1:  { stone: 'idle',     bg: 'neutral' },
  2:  { stone: 'idle',     bg: 'neutral' },
  3:  { stone: 'idle',     bg: 'neutral' },
  4:  { stone: 'idle',     bg: 'neutral' },
  5:  { stone: 'ready',    bg: 'neutral' },
  6:  { stone: 'ready',    bg: 'neutral' },
  7:  { stone: 'guidance', bg: 'warm-phase' },
  8:  { stone: 'idle',     bg: 'warm-phase' },
  9:  { stone: 'idle',     bg: 'warm-phase' },
  10: { stone: 'idle',     bg: 'warm-phase' },
  11: { stone: 'priming',  bg: 'warm-phase', settleDelay: 600 },
  12: { stone: 'ready',    bg: 'warm-phase' },
};

const DEFAULT_SETTLE_DELAY_MS = 500;

// Draft persistence — bump the version suffix when the stored shape changes
// so old drafts are ignored instead of deserializing into the wrong shape.
const DRAFT_STORAGE_KEY = 'essence-onboarding-draft-v1';

interface OnboardingDraft {
  currentScreen: number;
  form: ProfileFormState;
}

function loadDraft(): OnboardingDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OnboardingDraft;
    if (
      typeof parsed?.currentScreen !== 'number' ||
      typeof parsed?.form !== 'object' ||
      parsed.form === null
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveDraft(draft: OnboardingDraft) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Storage may be full or blocked (incognito) — silently accept the loss.
  }
}

function clearDraft() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

interface OnboardingScreenProps {
  data: OnboardingScreenData;
  onComplete: OnCompleteOnboarding;
}

// ─── Profile form state ───────────────────────────────────────────
// Single source of truth for the data the user enters across screens
// 8–10. Reducer-based to avoid the prior pattern of six independent
// useState hooks + ten onChange* callbacks drilled into Screen8.
type ProfileFormField = 'firstName' | 'lastName' | 'dob' | 'city' | 'stateCode';

interface ProfileFormState {
  firstName: string;
  lastName: string;
  dob: string;
  city: string;
  stateCode: string;
  hasPhoto: boolean;
}

type ProfileFormAction =
  | { type: 'set-field'; field: ProfileFormField; value: string }
  | { type: 'toggle-photo' };

function profileFormReducer(
  state: ProfileFormState,
  action: ProfileFormAction
): ProfileFormState {
  switch (action.type) {
    case 'set-field':
      return { ...state, [action.field]: action.value };
    case 'toggle-photo':
      return { ...state, hasPhoto: !state.hasPhoto };
  }
}

export function OnboardingScreen({ data, onComplete }: OnboardingScreenProps) {
  // ─── Wizard state ──────────────────────────────────────────
  const [currentScreen, setCurrentScreen] = useState<number>(1);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  // ─── Collected data (prefilled if user resumes) ────────────
  const [form, dispatch] = useReducer(profileFormReducer, {
    firstName: data.firstName ?? '',
    lastName: data.lastName ?? '',
    dob: data.dateOfBirth ?? '',
    city: data.city ?? '',
    stateCode: data.state ?? '',
    hasPhoto: false,
  });

  // Draft hydration — deferred to a post-mount effect so the first client
  // render matches SSR (no hydration mismatch). Persistence is also gated
  // on this flag so we don't overwrite the saved draft with the default
  // state before we've had a chance to read it.
  const [draftHydrated, setDraftHydrated] = useState(false);
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setCurrentScreen(draft.currentScreen);
      (Object.keys(draft.form) as (keyof ProfileFormState)[]).forEach((key) => {
        if (key === 'hasPhoto') {
          if (draft.form.hasPhoto !== false) dispatch({ type: 'toggle-photo' });
        } else {
          dispatch({ type: 'set-field', field: key, value: draft.form[key] });
        }
      });
    }
    setDraftHydrated(true);
  }, []);

  useEffect(() => {
    if (!draftHydrated) return;
    saveDraft({ currentScreen, form });
  }, [draftHydrated, currentScreen, form]);
  const setField = useCallback(
    (field: ProfileFormField, value: string) => {
      dispatch({ type: 'set-field', field, value });
    },
    []
  );
  const togglePhoto = useCallback(() => dispatch({ type: 'toggle-photo' }), []);

  // ─── Navigation ────────────────────────────────────────────
  const goNext = useCallback(() => {
    setDirection('forward');
    setCurrentScreen((s) => Math.min(TOTAL_SCREENS, s + 1));
  }, []);

  const goBack = useCallback(() => {
    setDirection('back');
    setCurrentScreen((s) => Math.max(1, s - 1));
  }, []);

  // Jump to a specific screen with correct directional animation.
  // Used by the "Change" link on Screen 11 to return to Screen 8.
  const goTo = useCallback((target: number) => {
    setCurrentScreen((prev) => {
      setDirection(target >= prev ? 'forward' : 'back');
      return Math.min(TOTAL_SCREENS, Math.max(1, target));
    });
  }, []);

  // ─── Completion ────────────────────────────────────────────
  const handleComplete = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onComplete(
        form.firstName.trim(),
        form.lastName.trim(),
        form.dob,
        form.city.trim(),
        form.stateCode,
        form.hasPhoto
      );
      clearDraft();
      // Caller navigates. If it doesn't, we stay on screen 11.
    } catch (err) {
      console.error('[OnboardingScreen] onComplete failed:', err);
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
      <PersistentStone currentScreen={currentScreen} />

      {/* Keyed wrapper: force remount on screen change so the slide
          animation replays and sub-screen `useEffect` timers reset
          (e.g. screen 10's 3500ms priming lock). */}
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
            hasPhoto={form.hasPhoto}
            onToggle={togglePhoto}
            onNext={goNext}
          />
        )}
        {currentScreen === 11 && <Screen11Priming onNext={goNext} />}
        {currentScreen === 12 && (
          <Screen12Ready
            onBegin={handleComplete}
            isSubmitting={isSubmitting}
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

// ═══════════════════════════════════════════════════════════════════════════
//  PROGRESS DOTS + BACK BUTTON
// ═══════════════════════════════════════════════════════════════════════════

function ProgressDots({ current }: { current: number }) {
  const dots = useMemo(() => Array.from({ length: TOTAL_SCREENS }), []);
  return (
    <div className="onboarding-progress" aria-hidden="true">
      {dots.map((_, i) => {
        const index = i + 1;
        let state = 'pending';
        if (index < current) state = 'completed';
        else if (index === current) state = 'active';
        return (
          <div key={i} className={`onboarding-dot onboarding-dot--${state}`} />
        );
      })}
    </div>
  );
}

function BackButton({
  visible,
  onBack,
  disabled,
}: {
  visible: boolean;
  onBack: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={`onboarding-back ${visible ? '' : 'onboarding-back--hidden'}`}
      onClick={onBack}
      aria-label="Go back"
      disabled={disabled || !visible}
    >
      <ChevronLeftIcon size={20} />
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  SHARED LAYOUT HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function StepShell({
  children,
  centered = false,
}: {
  children: ReactNode;
  centered?: boolean;
}) {
  return (
    <div className={`onboarding-step ${centered ? 'onboarding-step--centered' : ''}`}>
      {children}
    </div>
  );
}

// Empty layout slot that reserves the visual space the persistent
// stone occupies over the top of each screen. The actual BreathStone
// is rendered once at the wrapper level so it never remounts.
function StoneSlot() {
  return <div className="onboarding-stone-slot" aria-hidden="true" />;
}

// Single BreathStone instance, mounted once for the entire onboarding.
// It never unmounts — only its `state` prop changes as screens advance,
// so the engine transitions in place rather than restarting. The
// cinematic intro (blur + scale-up) plays once on initial mount.
//
// Settle behavior: when a screen calls for a non-idle state, we pause
// briefly before promoting. Without that pause the engine can interpolate
// from its current params toward the new high-amplitude target, which
// reads as a rubberband — especially on first mount or when advancing
// from idle-heavy early screens into ready/guidance/priming.
function PersistentStone({ currentScreen }: { currentScreen: number }) {
  const config = SCREEN_CONFIG[currentScreen];
  const target = config?.stone ?? 'idle';
  const delay = config?.settleDelay ?? DEFAULT_SETTLE_DELAY_MS;
  const [state, setState] = useState<BreathStoneState>('idle');

  useEffect(() => {
    // Idle target applies immediately; non-idle waits for settle delay
    // so the engine doesn't rubberband from its current params toward
    // the new high-amplitude target on the first render of a new screen.
    const effectiveDelay = target === 'idle' ? 0 : delay;
    const t = window.setTimeout(() => setState(target), effectiveDelay);
    return () => window.clearTimeout(t);
  }, [target, delay]);

  return (
    <div className="onboarding-persistent-stone" aria-hidden="true">
      <BreathStone state={state} size={144} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  SCREEN 1 — Welcome (cinematic intro)
// ═══════════════════════════════════════════════════════════════════════════

function Screen1({ onNext }: { onNext: () => void }) {
  return (
    <StepShell>
      <StoneSlot />

      <div className="onboarding-eyebrow">Welcome to ESSENCE</div>
      <h1 className="onboarding-title">Your voice is yours alone.</h1>
      <p className="onboarding-subtitle">
        We help you keep it safe for the people who matter most.
      </p>

      <div className="onboarding-ctas">
        <PrimaryButton onClick={onNext}>Continue</PrimaryButton>
      </div>
    </StepShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  SCREEN 2 — Purpose
// ═══════════════════════════════════════════════════════════════════════════

// Transient phrases that pass across the conveyor before "Your voice."
// lands. Order matters — first phrase fires at 2500ms, then +1500ms each.
// To add/remove: edit this list. CSS picks up --phrase-index automatically.
const CONVEYOR_PHRASES: readonly string[] = [
  'Birthday wishes.',
  'Love notes.',
  '\u201CI\u2019m proud of you.\u201D',
  'Life advice.',
  'Letters for later.',
  'A goodbye, whenever it comes.',
];

// "Your voice." land delay, in ms. = 1000 + (N+1) * 1500
// where N = CONVEYOR_PHRASES.length. The +1 puts it one slot after
// the final transient phrase. Kept as a derived constant so adding
// phrases doesn't require manual delay math.
const CONVEYOR_FINAL_LAND_MS = 1000 + (CONVEYOR_PHRASES.length + 1) * 1500;
// "Their timeline." enters 1400ms after "Your voice." finishes landing.
const CONVEYOR_TAIL_LAND_MS = CONVEYOR_FINAL_LAND_MS + 1400;

function Screen2({ onNext }: { onNext: () => void }) {
  return (
    <StepShell>
      <StoneSlot />

      <h1 className="onboarding-title">Here&apos;s what ESSENCE does.</h1>

      <div className="onboarding-body">
        <p>You record a few minutes of natural speech.</p>
        <p>We create a voice that sounds like you.</p>
        <p>Then you use it to leave messages for the future.</p>
      </div>

      {/* Cinematic conveyor — transient phrases slide through, then the
          final pair ("Your voice." / "Their timeline.") lands stacked
          and stays as the quiet conclusion. Add/remove transient
          entries by editing CONVEYOR_PHRASES; --phrase-index drives
          per-phrase delay via CSS calc. */}
      <div className="onboarding-conveyor" aria-hidden="true">
        {CONVEYOR_PHRASES.map((phrase, i) => (
          <span
            key={phrase}
            className="onboarding-conveyor__phrase"
            style={{ ['--phrase-index' as string]: i + 1 }}
          >
            {phrase}
          </span>
        ))}
        <span className="onboarding-conveyor__phrase onboarding-conveyor__phrase--final">
          Your voice.
        </span>
      </div>
      <div
        className="onboarding-conveyor-tail"
        aria-hidden="true"
        style={{ animationDelay: `${CONVEYOR_TAIL_LAND_MS}ms` }}
      >
        Their timeline.
      </div>

      <div className="onboarding-ctas onboarding-ctas--delayed">
        <PrimaryButton onClick={onNext}>Continue</PrimaryButton>
      </div>
    </StepShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  SCREEN 3 — Who this is for
// ═══════════════════════════════════════════════════════════════════════════

function Screen3({ onNext }: { onNext: () => void }) {
  return (
    <StepShell>
      <StoneSlot />

      <h1 className="onboarding-title">This is for people who plan ahead.</h1>

      <div className="onboarding-body">
        <p>Parents who want their grandchildren to hear their voice.</p>
        <p>Partners who want to leave love notes for special days.</p>
        <p>Whether you have all the time in the world, or not.</p>
        <p className="onboarding-body__emphasis">Your voice deserves to last.</p>
      </div>

      <div className="onboarding-ctas">
        <PrimaryButton onClick={onNext}>That sounds like me</PrimaryButton>
      </div>
    </StepShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  SCREEN 4 — Safety & trust
// ═══════════════════════════════════════════════════════════════════════════

function Screen4({
  onNext,
  onReadPrivacy,
}: {
  onNext: () => void;
  onReadPrivacy: () => void;
}) {
  return (
    <StepShell>
      <StoneSlot />

      <h1 className="onboarding-title">Your voice stays private. Always.</h1>

      <div className="onboarding-body">
        <p>
          We <span className="onboarding-body__never">never</span> sell your
          recordings.
        </p>
        <p>
          We <span className="onboarding-body__never">never</span> use them to
          train other products.
        </p>
        <p>
          We <span className="onboarding-body__never">never</span> share them
          without your permission.
        </p>
        <p className="onboarding-body__muted">
          Protected with end-to-end encryption.
        </p>
      </div>

      <button
        type="button"
        className="onboarding-secondary-link"
        onClick={onReadPrivacy}
      >
        Read our privacy promise
        <ChevronRightIcon size={14} />
      </button>

      <div className="onboarding-ctas">
        <PrimaryButton onClick={onNext}>I understand</PrimaryButton>
      </div>
    </StepShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  SCREEN 5 — Why your voice matters
// ═══════════════════════════════════════════════════════════════════════════

function Screen5({ onNext }: { onNext: () => void }) {
  return (
    <StepShell>
      <StoneSlot />

      <h1 className="onboarding-title">No one else sounds like you.</h1>

      <div className="onboarding-body">
        <p>The way you say someone&apos;s name.</p>
        <p>The rhythm of how you tell a story.</p>
        <p>The warmth in your laugh.</p>
        <p className="onboarding-body__emphasis">
          These things can&apos;t be written down. But they can be preserved.
        </p>
      </div>

      <div className="onboarding-ctas">
        <PrimaryButton onClick={onNext}>Continue</PrimaryButton>
      </div>
    </StepShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  SCREEN 6 — How this works (journey + time badge)
// ═══════════════════════════════════════════════════════════════════════════

function Screen6({ onNext }: { onNext: () => void }) {
  // Phase-transition choreography to Screen 7 — see DESIGN BRIEF 002.
  //   0ms   tap → haptic + button depress (scale 0.97)
  //   80ms  release, begin step exit (fade to 85%, drift left 12px)
  //   250ms call onNext → Screen 7 mounts with phase-enter animation
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
    }, 80);
    window.setTimeout(() => {
      onNext();
    }, 250);
  }, [exiting, onNext]);

  return (
    <div className={exiting ? 'onboarding-screen--exiting-phase' : ''}>
    <StepShell>
      <StoneSlot />

      <h1 className="onboarding-title">Here&apos;s how this works.</h1>

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
            <span className="onboarding-journey__duration">10–12 minutes</span>
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
          We&apos;ll guide every step — pause anytime.
        </p>
      </div>

      <div className="onboarding-ctas">
        <PrimaryButton
          onClick={handleBegin}
          disabled={exiting}
          className={pressing ? 'onboarding-btn-pressing' : ''}
        >
          Let&apos;s begin
        </PrimaryButton>
      </div>
    </StepShell>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  SCREEN 7 — Identity setup intro
// ═══════════════════════════════════════════════════════════════════════════

function Screen7({ onNext }: { onNext: () => void }) {
  return (
    <StepShell>
      <StoneSlot />

      <div className="onboarding-phase-label">YOUR PROFILE</div>
      <h1 className="onboarding-title">First, tell us a little about you.</h1>
      <p className="onboarding-subtitle">
        This helps us personalize your experience.
      </p>

      <div className="onboarding-ctas">
        <PrimaryButton onClick={onNext}>Get started</PrimaryButton>
      </div>
    </StepShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  SCREEN 8 — Combined "About you" form
//  Fields: first name, DOB (native <input type="date">), city.
//  Continue enables when all three are valid.
// ═══════════════════════════════════════════════════════════════════════════

function Screen8({
  form,
  onChange,
  onNext,
}: {
  form: ProfileFormState;
  onChange: (field: ProfileFormField, value: string) => void;
  onNext: () => void;
}) {
  const firstRef = useRef<HTMLInputElement>(null);

  // Auto-focus the first empty field after the slide settles.
  useEffect(() => {
    const t = setTimeout(() => firstRef.current?.focus(), 400);
    return () => clearTimeout(t);
  }, []);

  const { firstName, lastName, dob, city, stateCode } = form;
  const isValid =
    firstName.trim().length >= 1 &&
    lastName.trim().length >= 1 &&
    dob.length === 10 && // YYYY-MM-DD
    city.trim().length >= 2 &&
    stateCode.length === 2;

  return (
    <StepShell>
      <StoneSlot />

      <h1 className="onboarding-title">Tell us about you.</h1>
      <p className="onboarding-subtitle">
        A few quick details so your messages feel personal.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (isValid) onNext();
        }}
      >
      <div className="onboarding-form-card">
        <div className="onboarding-field-row">
          <div className="onboarding-field">
            <label className="onboarding-field__label" htmlFor="onb-first-name">
              First name
            </label>
            <input
              ref={firstRef}
              id="onb-first-name"
              type="text"
              className="onboarding-input"
              value={firstName}
              onChange={(e) => onChange('firstName', e.target.value)}
              placeholder="First"
              autoComplete="given-name"
              maxLength={50}
            />
          </div>
          <div className="onboarding-field">
            <label className="onboarding-field__label" htmlFor="onb-last-name">
              Last name
            </label>
            <input
              id="onb-last-name"
              type="text"
              className="onboarding-input"
              value={lastName}
              onChange={(e) => onChange('lastName', e.target.value)}
              placeholder="Last"
              autoComplete="family-name"
              maxLength={80}
            />
          </div>
        </div>

        <div className="onboarding-field">
          <label className="onboarding-field__label" htmlFor="onb-dob">
            Date of birth
          </label>
          <input
            id="onb-dob"
            type="date"
            className="onboarding-input"
            value={dob}
            onChange={(e) => onChange('dob', e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            min="1900-01-01"
          />
        </div>

        <div className="onboarding-field-row">
          <div className="onboarding-field onboarding-field--grow">
            <label className="onboarding-field__label" htmlFor="onb-city">
              City
            </label>
            <input
              id="onb-city"
              type="text"
              className="onboarding-input"
              value={city}
              onChange={(e) => onChange('city', e.target.value)}
              placeholder="Where you live"
              autoComplete="address-level2"
              maxLength={80}
            />
          </div>
          <div className="onboarding-field onboarding-field--fixed">
            <label className="onboarding-field__label" htmlFor="onb-state">
              State
            </label>
            <select
              id="onb-state"
              className="onboarding-input onboarding-input--select"
              value={stateCode}
              onChange={(e) => onChange('stateCode', e.target.value)}
              autoComplete="address-level1"
            >
              <option value="">—</option>
              {US_STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.code}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="onboarding-ctas">
        <PrimaryButton type="submit" disabled={!isValid}>
          Continue
        </PrimaryButton>
      </div>
      </form>
    </StepShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  SCREEN 9 — Review (verify captured data before proceeding)
// ═══════════════════════════════════════════════════════════════════════════

function Screen9Review({
  form,
  onEdit,
  onNext,
}: {
  form: ProfileFormState;
  onEdit: () => void;
  onNext: () => void;
}) {
  const { firstName, lastName, dob, city, stateCode } = form;
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

// ═══════════════════════════════════════════════════════════════════════════
//  SCREEN 10 — Photo upload (UI-only)
// ═══════════════════════════════════════════════════════════════════════════

function Screen10Photo({
  hasPhoto,
  onToggle,
  onNext,
}: {
  hasPhoto: boolean;
  onToggle: () => void;
  onNext: () => void;
}) {
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
        onClick={onToggle}
        aria-label={hasPhoto ? 'Remove photo' : 'Add photo'}
      >
        {!hasPhoto && (
          <>
            <CameraIcon size={32} />
            <span className="onboarding-photo__label">Tap to add</span>
          </>
        )}
      </button>

      <p
        className={`onboarding-photo-confirmation ${hasPhoto ? 'onboarding-photo-confirmation--visible' : ''}`}
      >
        Looking good ✓
      </p>

      <div className="onboarding-ctas">
        <PrimaryButton onClick={onNext}>
          {hasPhoto ? 'Save photo' : 'Continue without photo'}
        </PrimaryButton>
        {hasPhoto && (
          <LinkButton onClick={onNext}>Continue without photo</LinkButton>
        )}
      </div>
    </StepShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  SCREEN 11 — Priming moment (3500ms button unlock)
// ═══════════════════════════════════════════════════════════════════════════

function Screen11Priming({ onNext }: { onNext: () => void }) {
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setUnlocked(true), 3500);
    return () => clearTimeout(t);
  }, []);

  return (
    <StepShell>
      <StoneSlot />

      <h1 className="onboarding-title">Take a breath.</h1>
      <p className="onboarding-priming-hint">
        Breathe with the stone for a moment.
      </p>

      <div className="onboarding-body">
        <p>In a moment, you&apos;ll start recording your voice.</p>
        <p>Think of it like leaving a voicemail for someone you love.</p>
      </div>

      <div
        className={`onboarding-ctas ${unlocked ? 'onboarding-ctas--unlocked' : 'onboarding-ctas--locked'}`}
      >
        <PrimaryButton onClick={onNext}>Begin setup</PrimaryButton>
      </div>
    </StepShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  SCREEN 12 — Ready to begin
// ═══════════════════════════════════════════════════════════════════════════

function Screen12Ready({
  onBegin,
  isSubmitting,
}: {
  onBegin: () => void;
  isSubmitting: boolean;
}) {
  return (
    <StepShell>
      <StoneSlot />

      <h1 className="onboarding-title">Ready to begin recording?</h1>

      <div className="onboarding-ready-list">
        <p>You&apos;ll need about 10–13 minutes in a quiet space.</p>
        <p>We&apos;ll guide you through 25 short prompts.</p>
        <p>Your microphone will need to be enabled.</p>
      </div>

      <div className="onboarding-ctas">
        <PrimaryButton onClick={onBegin} isLoading={isSubmitting}>
          Begin recording
        </PrimaryButton>
        <LinkButton onClick={() => { /* no-op — user stays on screen */ }}>
          I need more time
        </LinkButton>
      </div>
    </StepShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  PRIVACY PROMISE — bottom sheet opened from Screen 4's "Read our
//  privacy promise" link. Deliberately not a new route or a full screen:
//  overlays onboarding so state is preserved. Structured as headline →
//  plain-language commitments → founding story. No CTA inside; user
//  returns to their place via the close affordance.
// ═══════════════════════════════════════════════════════════════════════════

function PrivacyPromiseModal({ onClose }: { onClose: () => void }) {
  // Close on Escape. Lock background scroll so the onboarding flow
  // behind the sheet doesn't move while the user reads.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div className="privacy-modal" role="dialog" aria-modal="true" aria-labelledby="privacy-title">
      <button
        type="button"
        className="privacy-modal__backdrop"
        onClick={onClose}
        aria-label="Close privacy promise"
      />
      <div className="privacy-modal__sheet">
        <div className="privacy-modal__handle" aria-hidden="true" />

        <button
          type="button"
          className="privacy-modal__close"
          onClick={onClose}
          aria-label="Close"
        >
          <CloseIcon size={18} />
        </button>

        <div className="privacy-modal__content">
          <ShieldIcon className="privacy-modal__shield" size={16} />
          <div className="privacy-modal__eyebrow">OUR PRIVACY PROMISE</div>
          <h2 id="privacy-title" className="privacy-modal__title">
            Your voice belongs to you. Full stop.
          </h2>

          <div className="privacy-modal__body">
            <p className="privacy-modal__intro">
              Your recordings are encrypted the moment they leave your device.
              They exist only for you and the people you choose. Not even our
              team can access them.
            </p>

            <ul className="privacy-modal__promises">
              <li className="privacy-modal__promise">
                <p className="privacy-modal__commitment">
                  We will <span className="privacy-modal__emphasis">never</span> sell your voice data.
                </p>
                <p className="privacy-modal__proof">
                  Not to advertisers. Not to researchers. Not to anyone.
                </p>
              </li>
              <li className="privacy-modal__promise">
                <p className="privacy-modal__commitment">
                  We will <span className="privacy-modal__emphasis">never</span> use your recordings to train AI models.
                </p>
                <p className="privacy-modal__proof">
                  Not ours. Not anyone else&apos;s.
                </p>
              </li>
              <li className="privacy-modal__promise">
                <p className="privacy-modal__commitment">
                  If you delete your account, your voice is{' '}
                  <span className="privacy-modal__emphasis">permanently gone</span>{' '}
                  from our servers within 48 hours.
                </p>
              </li>
            </ul>

            <p className="privacy-modal__signature">
              ESSENCE was built by people who lost someone.
              <br />
              We know what this holds.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
