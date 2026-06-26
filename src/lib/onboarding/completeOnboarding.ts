/**
 * Onboarding completion persistence.
 *
 * The `/onboarding` page's `completeOnboarding` server action owns the
 * normalization (smartCase, birth-year derivation, display-name assembly) and
 * the auth check; this helper owns only the final write + its error assertion.
 *
 * It is split out so the one safety-critical behavior — *a failed save must
 * raise, never resolve silently* (FOLLOW_UPS #42) — is unit-testable without a
 * live Supabase. Mirrors the error handling the sibling `uploadAvatar` action
 * already uses inline, and the `route-helpers.ts` pattern of Supabase-touching
 * helpers that take an injected client.
 *
 * Server-only.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The profile columns the onboarding wizard writes on completion. The caller
 * normalizes these before handing them over; the helper writes them verbatim
 * and stamps `onboarding_completed_at`.
 */
export interface OnboardingCompletionFields {
  first_name: string;
  last_name: string;
  display_name: string;
  date_of_birth: string;
  birth_year: number | null;
  city: string;
  state: string;
}

/**
 * Persist the final onboarding profile update and stamp completion.
 *
 * Throws on a failed write. Without this, a failed `profiles` UPDATE (RLS, a
 * transient DB error, a constraint) resolved as though it saved — the wizard
 * then navigated the user into the app having silently lost everything they
 * typed, and `onboarding_completed_at` stayed null, so they were treated as
 * not-onboarded on their next visit (FOLLOW_UPS #42). Raising lets the wizard
 * keep the user on the final screen with their draft intact so they can retry.
 */
export async function persistOnboardingCompletion(
  supabase: SupabaseClient,
  userId: string,
  fields: OnboardingCompletionFields,
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({
      ...fields,
      onboarding_completed_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to save onboarding profile: ${error.message}`);
  }
}
