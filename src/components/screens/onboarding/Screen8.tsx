'use client';

import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { PrimaryButton } from '@/components/ui';
import { US_STATES } from '@/lib/us-states';
import { ONBOARDING_TIMING } from '@/lib/config/onboarding-timing';
import { StepShell, StoneSlot } from './chrome';
import type { ProfileFormField, ProfileFormState } from './state';

// ─── SCREEN 8 — About you (combined form) ─────────────────────────
// Fields: first/last name, DOB (month/day/year selects), city, state.
// Continue is always pressable; validation triggers on press. Typing
// in an errored field clears that field's error (not the others).

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function parseDob(iso: string): { month: string; day: string; year: string } {
  if (iso && iso.length === 10) {
    const [y, m, d] = iso.split('-');
    return { month: String(parseInt(m, 10)), day: String(parseInt(d, 10)), year: y };
  }
  return { month: '', day: '', year: '' };
}

// JS Date "rolls over" invalid combinations (Feb 31 → Mar 3), so we
// reject anything that doesn't round-trip to the same m/d/y we fed in.
function isValidCalendarDate(month: string, day: string, year: string): boolean {
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);
  const y = parseInt(year, 10);
  if (!m || !d || !y) return false;
  const date = new Date(y, m - 1, d);
  return (
    date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
  );
}

type FormErrors = {
  firstName: string | null;
  lastName: string | null;
  dob: string | null;
  city: string | null;
  stateCode: string | null;
};

const EMPTY_ERRORS: FormErrors = {
  firstName: null,
  lastName: null,
  dob: null,
  city: null,
  stateCode: null,
};

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
    const t = setTimeout(
      () => firstRef.current?.focus(),
      ONBOARDING_TIMING.SCREEN8_AUTOFOCUS_DELAY_MS
    );
    return () => clearTimeout(t);
  }, []);

  const { firstName, lastName, dob, city, stateCode } = form;

  // Local mirrors of the three date parts. Seeded from form.dob so that
  // returning to Screen 8 via Screen 9's "Change" link shows the values
  // the user previously entered.
  const [dobMonth, setDobMonth] = useState(() => parseDob(dob).month);
  const [dobDay, setDobDay] = useState(() => parseDob(dob).day);
  const [dobYear, setDobYear] = useState(() => parseDob(dob).year);

  const [errors, setErrors] = useState<FormErrors>(EMPTY_ERRORS);

  // Emit upstream only when all three parts are set; otherwise clear so
  // `dob.length === 10` downstream stays correct.
  const emitDob = (month: string, day: string, year: string) => {
    if (month && day && year) {
      const composed = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      if (composed !== dob) onChange('dob', composed);
    } else if (dob !== '') {
      onChange('dob', '');
    }
  };

  const clearError = (key: keyof FormErrors) => {
    setErrors((prev) => (prev[key] ? { ...prev, [key]: null } : prev));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const next: FormErrors = { ...EMPTY_ERRORS };
    if (!firstName.trim()) next.firstName = 'Please add your first name.';
    if (!lastName.trim()) next.lastName = 'Please add your last name.';

    if (!dobMonth || !dobDay || !dobYear) {
      next.dob = 'Please complete your date of birth.';
    } else if (!isValidCalendarDate(dobMonth, dobDay, dobYear)) {
      next.dob = "That date doesn't look right. Please check.";
    }

    if (!city.trim()) next.city = 'Please add your city.';
    if (!stateCode) next.stateCode = 'Please choose your state.';

    const hasErrors = Object.values(next).some((v) => v !== null);
    if (!hasErrors) {
      onNext();
      return;
    }

    setErrors(next);

    // Scroll the first failing field into view if it's off-screen.
    const order: Array<{ key: keyof FormErrors; id: string }> = [
      { key: 'firstName', id: 'onb-first-name' },
      { key: 'lastName', id: 'onb-last-name' },
      { key: 'dob', id: 'onb-dob-month' },
      { key: 'city', id: 'onb-city' },
      { key: 'stateCode', id: 'onb-state' },
    ];
    const first = order.find((o) => next[o.key]);
    if (first) {
      requestAnimationFrame(() => {
        const el = document.getElementById(first.id);
        if (!el) return;
        const rect = el.getBoundingClientRect();
        if (rect.top < 0 || rect.bottom > window.innerHeight) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    }
  };

  // When DOB error is set: if any of the three is empty, flag the empty
  // ones; if all three are filled (invalid combination), flag all three.
  const dobPartErrorClass = (part: string) => {
    if (!errors.dob) return '';
    if (dobMonth && dobDay && dobYear) return 'onboarding-input--error';
    return part ? '' : 'onboarding-input--error';
  };

  return (
    <StepShell>
      <StoneSlot />

      <h1 className="onboarding-title">Tell us about you.</h1>
      <p className="onboarding-subtitle">
        A few quick details so your messages feel personal.
      </p>

      <form onSubmit={handleSubmit} noValidate>
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
              className={`onboarding-input${errors.firstName ? ' onboarding-input--error' : ''}`}
              value={firstName}
              onChange={(e) => {
                onChange('firstName', e.target.value);
                if (errors.firstName) clearError('firstName');
              }}
              autoComplete="given-name"
              maxLength={50}
              aria-invalid={!!errors.firstName}
            />
            <p className="onboarding-field__error" hidden={!errors.firstName}>
              {errors.firstName}
            </p>
          </div>
          <div className="onboarding-field">
            <label className="onboarding-field__label" htmlFor="onb-last-name">
              Last name
            </label>
            <input
              id="onb-last-name"
              type="text"
              className={`onboarding-input${errors.lastName ? ' onboarding-input--error' : ''}`}
              value={lastName}
              onChange={(e) => {
                onChange('lastName', e.target.value);
                if (errors.lastName) clearError('lastName');
              }}
              autoComplete="family-name"
              maxLength={80}
              aria-invalid={!!errors.lastName}
            />
            <p className="onboarding-field__error" hidden={!errors.lastName}>
              {errors.lastName}
            </p>
          </div>
        </div>

        <div className="onboarding-field">
          <span className="onboarding-field__label">Date of birth</span>
          <div className="onboarding-field-row">
            <div className="onboarding-field onboarding-field--fixed">
              <select
                id="onb-dob-month"
                className={`onboarding-input onboarding-input--select${dobPartErrorClass(dobMonth) ? ' ' + dobPartErrorClass(dobMonth) : ''}`}
                aria-label="Birth month"
                aria-invalid={!!errors.dob}
                value={dobMonth}
                onChange={(e) => {
                  setDobMonth(e.target.value);
                  emitDob(e.target.value, dobDay, dobYear);
                  if (errors.dob) clearError('dob');
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
                className={`onboarding-input onboarding-input--select${dobPartErrorClass(dobDay) ? ' ' + dobPartErrorClass(dobDay) : ''}`}
                aria-label="Birth day"
                aria-invalid={!!errors.dob}
                value={dobDay}
                onChange={(e) => {
                  setDobDay(e.target.value);
                  emitDob(dobMonth, e.target.value, dobYear);
                  if (errors.dob) clearError('dob');
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
                className={`onboarding-input onboarding-input--select${dobPartErrorClass(dobYear) ? ' ' + dobPartErrorClass(dobYear) : ''}`}
                aria-label="Birth year"
                aria-invalid={!!errors.dob}
                value={dobYear}
                onChange={(e) => {
                  setDobYear(e.target.value);
                  emitDob(dobMonth, dobDay, e.target.value);
                  if (errors.dob) clearError('dob');
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
          <p className="onboarding-field__error" hidden={!errors.dob}>
            {errors.dob}
          </p>
        </div>

        <div className="onboarding-field-row">
          <div className="onboarding-field onboarding-field--grow">
            <label className="onboarding-field__label" htmlFor="onb-city">
              City
            </label>
            <input
              id="onb-city"
              type="text"
              className={`onboarding-input${errors.city ? ' onboarding-input--error' : ''}`}
              value={city}
              onChange={(e) => {
                onChange('city', e.target.value);
                if (errors.city) clearError('city');
              }}
              autoComplete="address-level2"
              maxLength={80}
              aria-invalid={!!errors.city}
            />
            <p className="onboarding-field__error" hidden={!errors.city}>
              {errors.city}
            </p>
          </div>
          <div className="onboarding-field onboarding-field--fixed">
            <label className="onboarding-field__label" htmlFor="onb-state">
              State
            </label>
            <select
              id="onb-state"
              className={`onboarding-input onboarding-input--select${errors.stateCode ? ' onboarding-input--error' : ''}`}
              value={stateCode}
              onChange={(e) => {
                onChange('stateCode', e.target.value);
                if (errors.stateCode) clearError('stateCode');
              }}
              autoComplete="address-level1"
              aria-invalid={!!errors.stateCode}
            >
              <option value="">—</option>
              {US_STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.code}
                </option>
              ))}
            </select>
            <p className="onboarding-field__error" hidden={!errors.stateCode}>
              {errors.stateCode}
            </p>
          </div>
        </div>
      </div>

      <div className="onboarding-ctas">
        <PrimaryButton type="submit">
          Continue
        </PrimaryButton>
      </div>
      </form>
    </StepShell>
  );
}
