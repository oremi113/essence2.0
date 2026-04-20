'use client';

import { useEffect, useRef, useState } from 'react';
import { PrimaryButton } from '@/components/ui';
import { US_STATES } from '@/lib/us-states';
import { StepShell, StoneSlot } from './chrome';
import type { ProfileFormField, ProfileFormState } from './state';

// ─── SCREEN 8 — About you (combined form) ─────────────────────────
// Fields: first/last name, DOB (month/day/year selects), city, state.
// Continue enables when all are valid.

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function parseDob(iso: string): { month: string; day: string; year: string } {
  if (iso && iso.length === 10) {
    const [y, m, d] = iso.split('-');
    return { month: String(parseInt(m, 10)), day: String(parseInt(d, 10)), year: y };
  }
  return { month: '', day: '', year: '1960' };
}

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

  // Local mirrors of the three date parts. Seeded from form.dob so that
  // returning to Screen 8 via Screen 9's "Change" link shows the values
  // the user previously entered. Year defaults to 1960 when empty.
  const [dobMonth, setDobMonth] = useState(() => parseDob(dob).month);
  const [dobDay, setDobDay] = useState(() => parseDob(dob).day);
  const [dobYear, setDobYear] = useState(() => parseDob(dob).year);

  // Emit upstream only when all three parts are set; otherwise clear so
  // `dob.length === 10` in the validity check stays correct.
  const emitDob = (month: string, day: string, year: string) => {
    if (month && day && year) {
      const composed = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      if (composed !== dob) onChange('dob', composed);
    } else if (dob !== '') {
      onChange('dob', '');
    }
  };

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
              autoComplete="family-name"
              maxLength={80}
            />
          </div>
        </div>

        <div className="onboarding-field">
          <span className="onboarding-field__label">Date of birth</span>
          <div className="onboarding-field-row">
            <div className="onboarding-field onboarding-field--fixed">
              <select
                id="onb-dob-month"
                className="onboarding-input onboarding-input--select"
                aria-label="Birth month"
                value={dobMonth}
                onChange={(e) => {
                  setDobMonth(e.target.value);
                  emitDob(e.target.value, dobDay, dobYear);
                }}
              >
                <option value="">Month</option>
                {MONTHS.map((name, i) => (
                  <option key={name} value={i + 1}>{name}</option>
                ))}
              </select>
            </div>
            <div className="onboarding-field onboarding-field--fixed">
              <select
                id="onb-dob-day"
                className="onboarding-input onboarding-input--select"
                aria-label="Birth day"
                value={dobDay}
                onChange={(e) => {
                  setDobDay(e.target.value);
                  emitDob(dobMonth, e.target.value, dobYear);
                }}
              >
                <option value="">Day</option>
                {Array.from({ length: 31 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}</option>
                ))}
              </select>
            </div>
            <div className="onboarding-field onboarding-field--grow">
              <select
                id="onb-dob-year"
                className="onboarding-input onboarding-input--select"
                aria-label="Birth year"
                value={dobYear}
                onChange={(e) => {
                  setDobYear(e.target.value);
                  emitDob(dobMonth, dobDay, e.target.value);
                }}
              >
                <option value="">Year</option>
                {Array.from({ length: 86 }, (_, i) => {
                  const year = 2010 - i;
                  return <option key={year} value={year}>{year}</option>;
                })}
              </select>
            </div>
          </div>
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
