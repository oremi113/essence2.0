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
  /** ISO 3166-1 alpha-2 country code (privacy-regime signal), or null. */
  country: string | null;
  /** Short-lived signed URL for the user's avatar, or null if no photo
   *  has been uploaded yet. Refreshed on every page load. */
  avatarUrl: string | null;
  /** Whether onboarding has already been completed. If true, the
   *  wrapping page should redirect rather than re-render the wizard. */
  isCompleted: boolean;
}

/**
 * Server action signature used by the wizard. Called once from Screen 12.
 * `dateOfBirth` arrives as a YYYY-MM-DD string; `state` is a 2-letter US
 * code. The avatar (if any) is uploaded out-of-band on Screen 10 via
 * OnUploadAvatar.
 */
export type OnCompleteOnboarding = (
  firstName: string,
  lastName: string,
  dateOfBirth: string,
  city: string,
  state: string,
  country: string,
  termsAccepted: boolean
) => Promise<void>;

/**
 * Server action for the optional Screen 10 photo upload. Returns the new
 * signed URL on success so the wizard can render the just-uploaded image
 * inline (the next /onboarding load would also resolve a signed URL via
 * page.tsx, but holding the user for a navigation feels worse).
 *
 * Throws on validation/upload failure — the caller surfaces a retry.
 */
export type OnUploadAvatar = (formData: FormData) => Promise<{ avatarUrl: string }>;
