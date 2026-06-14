'use client';

/**
 * C2 — Waitlist ("What we're building next"). The "look ahead" a capped user
 * reaches from C3 (and, later, C1). Captures an email opt-in + an optional
 * multi-select of which V2 features matter most, then confirms.
 *
 * Production implementation of the `c2` + `c2-success` frames in
 * prototypes/message creation/essence-step6-pass2-c-screens.html. Pure and
 * props-driven per CLAUDE.md: the screen owns the form UI + the form↔success
 * phase; the effectful submit (POST + telemetry) is the page's, handed in as
 * `onSubmit` (so the screen imports no Supabase / no analytics).
 *
 * Tone (prototype header): value-add stewardship, never scarcity — "a look
 * ahead," not a paywall. The feature picks are a demand signal, not a gate;
 * the email is the only required field.
 *
 * Success stone is the shared canvas BreathStone in `shimmer` (warm, gentle
 * breath) — matching the prototype's `stone--shimmer`.
 */

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { BreathStone } from '@/components/breath-stone';
import { useReducedMotion } from '@/lib/animation/useReducedMotion';
import {
  WAITLIST_FEATURES,
  type WaitlistScreenProps,
} from './WaitlistScreen.types';
import { WAITLIST_CSS } from './WaitlistScreen.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STONE_SIZE = 140; // --stone-md in the prototype's scale
/** Success CTA focus: footer reveals at 1200ms; land focus as it arrives. */
const SUCCESS_FOCUS_MS = 1300;

export function WaitlistScreen({
  defaultEmail,
  onSubmit,
  onBackHome,
}: WaitlistScreenProps) {
  const reducedMotion = useReducedMotion();
  const [email, setEmail] = useState(defaultEmail);
  const [emailTouched, setEmailTouched] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [phase, setPhase] = useState<'form' | 'success'>('form');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const successCtaRef = useRef<HTMLButtonElement>(null);

  const emailValid = useMemo(() => EMAIL_RE.test(email.trim()), [email]);
  // Quiet inline affordance — only after the user has left an invalid field,
  // so the submit button isn't a silent dead-end (architect pass, Chunk 9).
  const showEmailHint = emailTouched && !emailValid;

  // Success: move focus to the single CTA once it has revealed.
  useEffect(() => {
    if (phase !== 'success') return;
    const id = setTimeout(
      () => successCtaRef.current?.focus({ preventScroll: true }),
      reducedMotion ? 0 : SUCCESS_FOCUS_MS,
    );
    return () => clearTimeout(id);
  }, [phase, reducedMotion]);

  function toggleFeature(value: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  async function handleSubmit() {
    if (submitting) return;
    if (!emailValid) {
      setEmailTouched(true); // reveal the hint instead of silently no-op'ing
      return;
    }
    setSubmitting(true);
    setError(null);
    // Registry order, not click order — stable for the telemetry array.
    const features = WAITLIST_FEATURES.filter((f) => selected.has(f.value)).map(
      (f) => f.value,
    );
    const ok = await onSubmit({ email: email.trim(), features });
    setSubmitting(false);
    if (ok) setPhase('success');
    else setError('Something slipped on our end. Please try again.');
  }

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault(); // SPA submit — no navigation
    void handleSubmit();
  }

  if (phase === 'success') {
    return (
      <div className="waitlist-screen">
        <style>{WAITLIST_CSS}</style>
        <div
          className="waitlist-success"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="success-stone-wrap" aria-hidden="true">
            <BreathStone state="shimmer" size={STONE_SIZE} reducedMotion={reducedMotion} />
          </div>
          <h1 className="waitlist-success-title">You&rsquo;re on the list.</h1>
          <p className="waitlist-success-aside">
            We&rsquo;ll write when something&rsquo;s ready. Your voice stays
            preserved while you wait.
          </p>
        </div>
        <div className="footer footer--success">
          <button ref={successCtaRef} type="button" className="btn" onClick={onBackHome}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="waitlist-screen"
      aria-labelledby="waitlistTitle"
      onSubmit={handleFormSubmit}
      noValidate
    >
      <style>{WAITLIST_CSS}</style>

      <div className="waitlist">
        <p className="waitlist-eyebrow reveal">Coming to Essence</p>
        <h1 className="waitlist-title reveal" id="waitlistTitle">
          What we&rsquo;re building next.
        </h1>
        <p className="waitlist-subtitle reveal">
          Tell us what matters most to you, and we&rsquo;ll let you know when
          it&rsquo;s ready.
        </p>

        <div
          className="waitlist-features reveal"
          role="group"
          aria-label="Which features matter most to you"
        >
          <span className="waitlist-features-label">Features in development</span>
          {WAITLIST_FEATURES.map((f) => {
            const checked = selected.has(f.value);
            return (
              <button
                key={f.value}
                type="button"
                className="waitlist-feature"
                aria-pressed={checked}
                onClick={() => toggleFeature(f.value)}
              >
                <span className="waitlist-feature__check" aria-hidden="true">
                  <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                    <path
                      d="M1 5L4.5 8.5L11 1.5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="waitlist-feature__text">
                  {f.label}
                  <span className="waitlist-feature__helper">{f.helper}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="waitlist-email reveal">
          <label className="waitlist-email-label" htmlFor="waitlistEmail">
            Notify at
          </label>
          <input
            type="email"
            className="waitlist-email-input"
            id="waitlistEmail"
            value={email}
            autoComplete="email"
            inputMode="email"
            aria-invalid={showEmailHint}
            aria-describedby={showEmailHint ? 'waitlistEmailHint' : undefined}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null);
            }}
            onBlur={() => setEmailTouched(true)}
          />
          {showEmailHint && (
            <p className="waitlist-error" id="waitlistEmailHint">
              That doesn&rsquo;t look like an email yet.
            </p>
          )}
          {error && (
            <p className="waitlist-error" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>

      <div className="footer">
        <button
          type="submit"
          className="btn"
          disabled={!emailValid || submitting}
        >
          {submitting ? 'Adding you…' : 'Add me to the list'}
        </button>
        <button type="button" className="btn--link" onClick={onBackHome}>
          Back to Home
        </button>
      </div>
    </form>
  );
}
