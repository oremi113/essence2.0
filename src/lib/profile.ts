import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  created_at: string;
  display_name: string | null;
  onboarding_state: string;
  last_active_at: string | null;
};

export async function getOrCreateProfile(): Promise<Profile> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("getOrCreateProfile requires an authenticated user");
  }

  const { data: existing } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (existing) {
    return existing as Profile;
  }

  const { data: inserted, error } = await supabase
    .from("profiles")
    .insert({ id: user.id, display_name: null })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create profile: ${error.message}`);
  }
  return inserted as Profile;
}
