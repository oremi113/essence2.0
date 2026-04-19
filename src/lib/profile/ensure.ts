import "server-only";
import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Idempotent profile upsert via service role. Closes a narrow race: several
 * tables (usage_events, training_clips, voice_profiles) FK to
 * public.profiles(user_id), and a fresh auth.users row won't have a profile
 * until something explicitly creates one. The canonical fix is the
 * on_auth_user_created trigger (see migration
 * 20260413_auth_signup_profile_trigger.sql); this helper is a defensive
 * fallback for environments where the trigger hasn't been applied yet, and
 * for any code path that wants a local guarantee before writing.
 *
 * Uses the service client so it bypasses RLS and won't be blocked by the
 * profiles_* policies (which require auth.uid() = user_id).
 */
export async function ensureProfile(
  serviceClient: SupabaseClient,
  userId: string
): Promise<void> {
  const { error } = await serviceClient
    .from("profiles")
    .upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true });
  if (error) {
    // Swallow — this is a self-healing guard, not a hard dependency. Real
    // write failures will surface at the FK-protected insert site.
    console.error("[profile-ensure] upsert failed:", error.message);
  }
}
