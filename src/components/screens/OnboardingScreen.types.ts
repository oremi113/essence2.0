/**
 * Data shuttle for the 11-screen onboarding wizard.
 *
 * All fields are prefill-optional — if the user resumes after partial
 * progress, we render their existing values as defaults.
 */
export interface OnboardingScreenData {
  /** First name — used as {userName} in voice training prompts. */
  firstName: string | null;
  /** Last name — paired with first_name for full personalization. */
  lastName: string | null;
  /** ISO date string `YYYY-MM-DD`, or null if not yet collected. */
  dateOfBirth: string | null;
  /** City — `profiles.city`. */
  city: string | null;
  /** 2-letter US state code (e.g. "CA"), or null. */
  state: string | null;
  /** Whether onboarding has already been completed. If true, the
   *  wrapping page should redirect rather than re-render the wizard. */
  isCompleted: boolean;
}

/**
 * Server action signature used by the wizard. Called once from Screen 11.
 * `dateOfBirth` arrives as a YYYY-MM-DD string; `state` is a 2-letter US
 * code. `hasPhoto` is a UI flag only — Storage wiring is deferred.
 */
export type OnCompleteOnboarding = (
  firstName: string,
  lastName: string,
  dateOfBirth: string,
  city: string,
  state: string,
  hasPhoto: boolean
) => Promise<void>;
