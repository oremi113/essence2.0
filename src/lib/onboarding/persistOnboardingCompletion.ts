import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

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
 * Persist the onboarding wizard's collected profile fields and stamp
 * `onboarding_completed_at`.
 *
 * **Throws on a write error** — this is the whole point of the helper
 * (FOLLOW_UPS #42). The wizard is the first flow every new user hits; if this
 * UPDATE fails silently (RLS, transient DB error, constraint) the action would
 * resolve as though it saved, the wizard would navigate into the app, and
 * everything the user typed would be lost while `onboarding_completed_at` stays
 * null (so they're treated as not-onboarded next visit). Failing loud lets the
 * screen keep the user on the wizard with their draft intact so they can retry.
 *
 * `completedAt` is injectable so callers/tests stay deterministic.
 */
export async function persistOnboardingCompletion(
  supabase: SupabaseClient<Database>,
  userId: string,
  fields: OnboardingCompletionFields,
  completedAt: string = new Date().toISOString(),
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ ...fields, onboarding_completed_at: completedAt })
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Could not save your onboarding details: ${error.message}`);
  }
}
