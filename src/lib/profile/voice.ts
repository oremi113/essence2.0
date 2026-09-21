import "server-only";
import { getOrCreateProfile } from "./core";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Matches public.voice_profile_status enum. Keep in sync with DB. */
export type VoiceProfileStatus =
  | "created"
  | "collecting"
  | "queued"       // added by RUN_IN_DASHBOARD_voice_profiles_attempt_tracking
  | "processing"
  | "ready"
  | "failed"
  | "archived";

export type VoiceProfile = {
  id: string;
  user_id: string;
  label: string;
  status: VoiceProfileStatus;
  relationship: string | null;
  /** Creation-attempt tracking, used by the retry policy in
   *  `lib/voice-training/backoff.ts`. Home A's `failed` register branches on
   *  these to decide whether a "Try again" would actually run. */
  attempt_count: number | null;
  last_attempt_at: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * The canonical "which voice profile is this user on?" query — newest first,
 * archived excluded. Returns null when the user has no live profile.
 *
 * This exists because the selection used to be written out at each call site
 * and the copies disagreed (FOLLOW_UPS #105). `/app/record` filtered archived
 * rows and ordered by `created_at`; `getOrCreateVoiceProfile` did neither, so
 * it could hand back a discarded profile, and — with no ORDER BY, where
 * Postgres may return any matching row — a *different* profile than the one
 * the record flow resumed into. A user can hold more than one: `?new=1` on
 * `/app/record` creates them by design.
 *
 * Every caller that asks "the user's voice profile" goes through here, so the
 * copies cannot drift apart again.
 */
export async function getActiveVoiceProfile(): Promise<VoiceProfile | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("getActiveVoiceProfile requires an authenticated user");
  }

  const { data, error } = await supabase
    .from("voice_profiles")
    .select("*")
    .eq("user_id", user.id)
    .neq("status", "archived")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as VoiceProfile | null) ?? null;
}

/**
 * The active voice profile, creating one when the user has none.
 *
 * "None" means no *live* profile: a user whose only rows are archived gets a
 * fresh one rather than being handed a discarded voice. Before #105 an
 * archived row suppressed creation, which left that user stuck on a profile
 * the app had already thrown away.
 */
export async function getOrCreateVoiceProfile(): Promise<VoiceProfile> {
  await getOrCreateProfile();

  const existing = await getActiveVoiceProfile();
  if (existing) return existing;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("getOrCreateVoiceProfile requires an authenticated user");
  }

  const { data: inserted, error: insertError } = await supabase
    .from("voice_profiles")
    .insert({
      user_id: user.id,
      label: "Default",
    })
    .select("*")
    .single();

  if (insertError) throw insertError;
  return inserted as VoiceProfile;
}
