'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { BreathStone, type BreathStoneState } from '@/components/breath-stone';
import { PrimaryButton, LinkButton } from '@/components/ui';
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

type BgKey = 'neutral' | 'warm-1' | 'warm-2' | 'gold' | 'rich';

/**
 * Single background across the entire onboarding. The BreathStone carries
 * all the visual warmth and emotional cue — the frame stays quiet so the
 * content reads cleanly and the stone remains the sole source of movement
 * and color. If we ever want a deliberate two-phase shift (cool for
 * orientation screens 1-6, warm for personal setup 7-12), re-assign the
 * values below — the CSS and wrapper plumbing already support all 5 tones.
 */
// The stone is a continuous companion across the entire onboarding —
// it never unmounts between screens. Its animation state is the only
// thing that changes per screen.
const STONE_STATE_BY_SCREEN: Record<number, BreathStoneState> = {
  1: 'idle',
  2: 'idle',
  3: 'idle',
  4: 'idle',
  5: 'ready',
  6: 'ready',
  7: 'idle',
  8: 'idle',
  9: 'idle',
  10: 'idle',
  11: 'priming',
  12: 'ready',
};

const BG_BY_SCREEN: Record<number, BgKey> = {
  1: 'neutral',
  2: 'neutral',
  3: 'neutral',
  4: 'neutral',
  5: 'neutral',
  6: 'neutral',
  7: 'neutral',
  8: 'neutral',
  9: 'neutral',
  10: 'neutral',
  11: 'neutral',
  12: 'neutral',
};

interface OnboardingScreenProps {
  data: OnboardingScreenData;
  onComplete: OnCompleteOnboarding;
}

export function OnboardingScreen({ data, onComplete }: OnboardingScreenProps) {
  // ─── Wizard state ──────────────────────────────────────────
  const [currentScreen, setCurrentScreen] = useState<number>(1);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  // ─── Collected data (prefilled if user resumes) ────────────
  const [firstName, setFirstName] = useState(data.firstName ?? '');
  const [lastName, setLastName] = useState(data.lastName ?? '');
  const [dob, setDob] = useState(data.dateOfBirth ?? '');
  const [city, setCity] = useState(data.city ?? '');
  const [stateCode, setStateCode] = useState(data.state ?? '');
  const [hasPhoto, setHasPhoto] = useState(false);

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
        firstName.trim(),
        lastName.trim(),
        dob,
        city.trim(),
        stateCode,
        hasPhoto
      );
      // Caller navigates. If it doesn't, we stay on screen 11.
    } catch (err) {
      console.error('[OnboardingScreen] onComplete failed:', err);
      setIsSubmitting(false);
    }
  }, [isSubmitting, onComplete, firstName, lastName, dob, city, stateCode, hasPhoto]);

  // ─── Render ────────────────────────────────────────────────
  const bg = BG_BY_SCREEN[currentScreen] ?? 'neutral';
  const wrapperClass = `onboarding-wrapper onboarding-bg-${bg}`;
  const slideClass = direction === 'forward'
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
          <Screen8
            firstName={firstName}
            lastName={lastName}
            dob={dob}
            city={city}
            stateCode={stateCode}
            onChangeFirstName={setFirstName}
            onChangeLastName={setLastName}
            onChangeDob={setDob}
            onChangeCity={setCity}
            onChangeState={setStateCode}
            onNext={goNext}
          />
        )}
        {currentScreen === 9 && (
          <Screen9Review
            firstName={firstName}
            lastName={lastName}
            dob={dob}
            city={city}
            stateCode={stateCode}
            onEdit={() => goTo(8)}
            onNext={goNext}
          />
        )}
        {currentScreen === 10 && (
          <Screen10Photo
            hasPhoto={hasPhoto}
            onToggle={() => setHasPhoto((p) => !p)}
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
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6" />
      </svg>
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
function PersistentStone({ currentScreen }: { currentScreen: number }) {
  const state = STONE_STATE_BY_SCREEN[currentScreen] ?? 'idle';
  return (
    <div className="onboarding-persistent-stone" aria-hidden="true">
      <BreathStone state={state} size={120} />
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

      {/* Cinematic conveyor — 10 transient phrases slide through,
          then the final pair ("Your voice." / "Their timeline.")
          lands stacked and stays as the quiet conclusion. */}
      <div className="onboarding-conveyor" aria-hidden="true">
        <span className="onboarding-conveyor__phrase onboarding-conveyor__phrase--1">
          Bedtime stories.
        </span>
        <span className="onboarding-conveyor__phrase onboarding-conveyor__phrase--2">
          Holiday greetings.
        </span>
        <span className="onboarding-conveyor__phrase onboarding-conveyor__phrase--3">
          Words of comfort.
        </span>
        <span className="onboarding-conveyor__phrase onboarding-conveyor__phrase--4">
          Graduation messages.
        </span>
        <span className="onboarding-conveyor__phrase onboarding-conveyor__phrase--5">
          Daily affirmations.
        </span>
        <span className="onboarding-conveyor__phrase onboarding-conveyor__phrase--6">
          &ldquo;I&rsquo;m proud of you.&rdquo;
        </span>
        <span className="onboarding-conveyor__phrase onboarding-conveyor__phrase--7">
          Just because moments.
        </span>
        <span className="onboarding-conveyor__phrase onboarding-conveyor__phrase--8">
          Letters for later.
        </span>
        <span className="onboarding-conveyor__phrase onboarding-conveyor__phrase--9">
          A goodbye, whenever it comes.
        </span>
        <span className="onboarding-conveyor__phrase onboarding-conveyor__phrase--final-top">
          Your voice.
        </span>
        <span className="onboarding-conveyor__phrase onboarding-conveyor__phrase--final-bottom">
          Their timeline.
        </span>
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
        <p className="onboarding-body__emphasis">
          You don&apos;t need to be sick. You just need to care.
        </p>
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

      <div className="onboarding-ctas">
        <PrimaryButton onClick={onNext}>I understand</PrimaryButton>
        <LinkButton onClick={onReadPrivacy}>
          Read our privacy promise
        </LinkButton>
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
  return (
    <StepShell>
      <StoneSlot />

      <h1 className="onboarding-title">Here&apos;s how this works.</h1>

      <ol className="onboarding-journey">
        <li className="onboarding-journey__item">
          <span className="onboarding-journey__num">1</span>
          <span className="onboarding-journey__label">
            Tell us about yourself
            <span className="onboarding-journey__duration">(2 minutes)</span>
          </span>
        </li>
        <li className="onboarding-journey__item">
          <span className="onboarding-journey__num">2</span>
          <span className="onboarding-journey__label">
            Record your voice
            <span className="onboarding-journey__duration">(10–13 minutes)</span>
          </span>
        </li>
        <li className="onboarding-journey__item">
          <span className="onboarding-journey__num">3</span>
          <span className="onboarding-journey__label">
            Create your first message
          </span>
        </li>
      </ol>

      <div className="onboarding-time-badge-row">
        <span className="onboarding-time-badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          About 15 minutes total
        </span>
      </div>

      <div className="onboarding-body">
        <p className="onboarding-body__muted">
          You can pause anytime and pick up where you left off.
        </p>
        <p className="onboarding-body__muted">
          We&apos;ll guide you through every step. There&apos;s no wrong way
          to do this.
        </p>
      </div>

      <div className="onboarding-ctas">
        <PrimaryButton onClick={onNext}>Let&apos;s begin</PrimaryButton>
      </div>
    </StepShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  SCREEN 7 — Identity setup intro
// ═══════════════════════════════════════════════════════════════════════════

function Screen7({ onNext }: { onNext: () => void }) {
  return (
    <StepShell>
      <StoneSlot />

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

const US_STATES: readonly { code: string; name: string }[] = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' }, { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' },
  { code: 'DC', name: 'District of Columbia' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' }, { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' }, { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' }, { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' }, { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' }, { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' }, { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' }, { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
] as const;

function Screen8({
  firstName,
  lastName,
  dob,
  city,
  stateCode,
  onChangeFirstName,
  onChangeLastName,
  onChangeDob,
  onChangeCity,
  onChangeState,
  onNext,
}: {
  firstName: string;
  lastName: string;
  dob: string;
  city: string;
  stateCode: string;
  onChangeFirstName: (v: string) => void;
  onChangeLastName: (v: string) => void;
  onChangeDob: (v: string) => void;
  onChangeCity: (v: string) => void;
  onChangeState: (v: string) => void;
  onNext: () => void;
}) {
  const firstRef = useRef<HTMLInputElement>(null);

  // Auto-focus the first empty field after the slide settles.
  useEffect(() => {
    const t = setTimeout(() => firstRef.current?.focus(), 400);
    return () => clearTimeout(t);
  }, []);

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
        Your name, birthday, and where you live help make your messages feel
        personal.
      </p>

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
              onChange={(e) => onChangeFirstName(e.target.value)}
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
              onChange={(e) => onChangeLastName(e.target.value)}
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
            onChange={(e) => onChangeDob(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            min="1900-01-01"
          />
          <p className="onboarding-field__helper">MM / DD / YYYY</p>
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
              onChange={(e) => onChangeCity(e.target.value)}
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
              onChange={(e) => onChangeState(e.target.value)}
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
        <PrimaryButton onClick={onNext} disabled={!isValid}>
          Continue
        </PrimaryButton>
      </div>
    </StepShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  SCREEN 9 — Review (verify captured data before proceeding)
// ═══════════════════════════════════════════════════════════════════════════

function Screen9Review({
  firstName,
  lastName,
  dob,
  city,
  stateCode,
  onEdit,
  onNext,
}: {
  firstName: string;
  lastName: string;
  dob: string;
  city: string;
  stateCode: string;
  onEdit: () => void;
  onNext: () => void;
}) {
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
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
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

      <div className="onboarding-body">
        <p>In a moment, you&apos;ll start recording your voice.</p>
        <p>Think of it like leaving a voicemail for someone you love.</p>
      </div>

      <p className="onboarding-priming-hint">
        Breathe with the stone for a moment.
      </p>

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
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="privacy-modal__content">
          <svg
            className="privacy-modal__shield"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
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
