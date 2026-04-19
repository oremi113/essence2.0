import "server-only";
import { getOrCreateProfile } from "./core";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Matches public.voice_profile_status enum. Keep in sync with DB. */
export type VoiceProfileStatus =
  | "created"
  | "collecting"
  | "queued"
  | "processing"
  | "ready"
  | "failed"
  | "archived";

export type VoiceProfile = {
  id: string;
  user_id: string;
  label: string;
  status: VoiceProfileStatus;
  created_at: string;
  updated_at: string;
};

export async function getOrCreateVoiceProfile(): Promise<VoiceProfile> {
  await getOrCreateProfile();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("getOrCreateVoiceProfile requires an authenticated user");
  }

  const { data: existing, error: findError } = await supabase
    .from("voice_profiles")
    .select("*")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (findError) throw findError;
  if (existing) return existing as VoiceProfile;

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
