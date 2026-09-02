/**
 * Onboarding wizard state — reducer + draft persistence + hook.
 *
 * The wizard's data crosses three sub-screens (8 form / 9 review / 10 photo);
 * everything else is purely presentational. A single reducer + draft
 * persistence module keeps that concern out of the orchestrator and the
 * sub-screens.
 *
 * Draft contract:
 *   - Versioned key (v1) — bump the suffix when the stored shape changes
 *     so old drafts are ignored instead of deserializing into the wrong
 *     shape and crashing the wizard on hydration.
 *   - avatarUrl is NEVER persisted: signed URLs expire after an hour and
 *     the server is the source of truth. Re-render mints a fresh URL via
 *     page.tsx.
 */
import { useCallback, useEffect, useReducer, useState } from 'react';
import { DEFAULT_COUNTRY } from '@/lib/countries';

// ─── Reducer types ────────────────────────────────────────────────

export type ProfileFormField =
  | 'firstName'
  | 'lastName'
  | 'dob'
  | 'city'
  | 'stateCode'
  | 'country';

export interface ProfileFormState {
  firstName: string;
  lastName: string;
  dob: string;
  city: string;
  stateCode: string;
  /** ISO 3166-1 alpha-2 country code (privacy-regime signal). */
  country: string;
  /** True once the user affirmatively accepts the legal documents (Screen 4). */
  termsAccepted: boolean;
  /** Signed URL for the uploaded avatar, or null if none. */
  avatarUrl: string | null;
}

type ProfileFormAction =
  | { type: 'set-field'; field: ProfileFormField; value: string }
  | { type: 'set-terms-accepted'; value: boolean }
  | { type: 'set-avatar'; url: string | null };

function profileFormReducer(
  state: ProfileFormState,
  action: ProfileFormAction
): ProfileFormState {
  switch (action.type) {
    case 'set-field':
      return { ...state, [action.field]: action.value };
    case 'set-terms-accepted':
      return { ...state, termsAccepted: action.value };
    case 'set-avatar':
      return { ...state, avatarUrl: action.url };
  }
}

// ─── Draft persistence (localStorage) ─────────────────────────────

// v2: added `country` + `termsAccepted`. The bump makes old v1 drafts ignored
// rather than deserialized into the wrong shape.
const DRAFT_STORAGE_KEY = 'essence-onboarding-draft-v2';

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

export function clearDraft() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

// ─── useOnboardingForm — combined state + draft hydration hook ────

export interface UseOnboardingFormSeed {
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  avatarUrl: string | null;
}

export interface UseOnboardingFormResult {
  form: ProfileFormState;
  currentScreen: number;
  setCurrentScreen: (n: number | ((prev: number) => number)) => void;
  setField: (field: ProfileFormField, value: string) => void;
  setAvatarUrl: (url: string | null) => void;
  setTermsAccepted: (value: boolean) => void;
}

/**
 * Owns the wizard form + currentScreen state. Hydrates from localStorage
 * on first paint (deferred to a post-mount effect to avoid SSR hydration
 * mismatch) and writes back on every change once hydration completes —
 * the gate flag is what keeps a fresh-tab default from clobbering a saved
 * draft before we've had a chance to read it.
 */
export function useOnboardingForm(seed: UseOnboardingFormSeed): UseOnboardingFormResult {
  const [currentScreen, setCurrentScreen] = useState<number>(1);
  const [form, dispatch] = useReducer(profileFormReducer, {
    firstName: seed.firstName ?? '',
    lastName: seed.lastName ?? '',
    dob: seed.dateOfBirth ?? '',
    city: seed.city ?? '',
    stateCode: seed.state ?? '',
    country: seed.country ?? DEFAULT_COUNTRY,
    termsAccepted: false,
    avatarUrl: seed.avatarUrl,
  });

  const [draftHydrated, setDraftHydrated] = useState(false);
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      // Hydration MUST happen in an effect (not render) so the server-rendered
      // markup matches the client's first paint — localStorage is browser-only.
      // The cascading-render lint warning is the cost of doing this correctly;
      // suppressing here so future readers don't "fix" it back into a hydration
      // mismatch crash.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentScreen(draft.currentScreen);
      (Object.keys(draft.form) as (keyof ProfileFormState)[]).forEach((key) => {
        if (key === 'avatarUrl' || key === 'termsAccepted') return;
        dispatch({ type: 'set-field', field: key, value: draft.form[key] as string });
      });
      if (typeof draft.form.termsAccepted === 'boolean') {
        dispatch({ type: 'set-terms-accepted', value: draft.form.termsAccepted });
      }
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
  const setAvatarUrl = useCallback(
    (url: string | null) => dispatch({ type: 'set-avatar', url }),
    []
  );
  const setTermsAccepted = useCallback(
    (value: boolean) => dispatch({ type: 'set-terms-accepted', value }),
    []
  );

  return {
    form,
    currentScreen,
    setCurrentScreen,
    setField,
    setAvatarUrl,
    setTermsAccepted,
  };
}
