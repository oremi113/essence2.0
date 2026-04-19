/**
 * Twelve onboarding sub-screens. All but Screens 8/9/10/12 are pure
 * presentational; the wizard's data-bearing screens take a thin slice
 * of form state via props.
 *
 * Stone state + background tone per screen lives in chrome.ts
 * SCREEN_CONFIG — these components don't pick stone behavior themselves.
 */
'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import { PrimaryButton, LinkButton } from '@/components/ui';
import { US_STATES } from '@/lib/us-states';
import {
  CameraIcon,
  ChevronRightIcon,
  ClockIcon,
} from '@/components/icons';
import type { OnUploadAvatar } from '../OnboardingScreen.types';
import type { ProfileFormField, ProfileFormState } from './state';
import { StepShell, StoneSlot } from './chrome';

// ─── SCREEN 1 — Welcome ───────────────────────────────────────────

export function Screen1({ onNext }: { onNext: () => void }) {
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

// ─── SCREEN 2 — Purpose / cinematic conveyor ──────────────────────
//
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

export function Screen2({ onNext }: { onNext: () => void }) {
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

// ─── SCREEN 3 — Who this is for ───────────────────────────────────

export function Screen3({ onNext }: { onNext: () => void }) {
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

// ─── SCREEN 4 — Safety & trust ────────────────────────────────────

export function Screen4({
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

// ─── SCREEN 5 — Why your voice matters ────────────────────────────

export function Screen5({ onNext }: { onNext: () => void }) {
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

// ─── SCREEN 6 — How this works (journey + time badge) ─────────────

export function Screen6({ onNext }: { onNext: () => void }) {
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

// ─── SCREEN 7 — Identity setup intro ──────────────────────────────

export function Screen7({ onNext }: { onNext: () => void }) {
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

// ─── SCREEN 8 — About you (combined form) ─────────────────────────
// Fields: first/last name, DOB (native <input type="date">), city, state.
// Continue enables when all are valid.

export function Screen8({
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
  // Local preview while the upload is in flight. Cleared once the server
  // returns the signed URL (which then renders from `avatarUrl`).
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Revoke any object URL we created — leaving them around leaks memory in
  // long sessions where the user toggles photos repeatedly.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const hasPhoto = Boolean(avatarUrl ?? preview);
  const displayUrl = preview ?? avatarUrl;

  const handlePickFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

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
        onAvatarChange(nextUrl);
      } catch (err) {
        // Roll the preview back so the circle reflects the unchanged state.
        URL.revokeObjectURL(objectUrl);
        setPreview(null);
        setError(err instanceof Error ? err.message : 'Upload failed.');
      } finally {
        setIsUploading(false);
      }
    },
    [onUpload, onAvatarChange]
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void handleFile(file);
      // Reset so picking the same file again still triggers change.
      e.target.value = '';
    },
    [handleFile]
  );

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
        onChange={handleChange}
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

// ─── SCREEN 11 — Priming moment (3500ms button unlock) ────────────

export function Screen11Priming({ onNext }: { onNext: () => void }) {
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

// ─── SCREEN 12 — Ready to begin ───────────────────────────────────

export function Screen12Ready({
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
