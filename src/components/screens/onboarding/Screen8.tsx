'use client';

import { useEffect, useRef } from 'react';
import { PrimaryButton } from '@/components/ui';
import { US_STATES } from '@/lib/us-states';
import { StepShell, StoneSlot } from './chrome';
import type { ProfileFormField, ProfileFormState } from './state';

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
