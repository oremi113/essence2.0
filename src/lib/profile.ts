import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  created_at: string;
  display_name: string | null;
  onboarding_state: string;
  last_active_at: string | null;
  /** User's city — used for {city} placeholder in V2 training script. */
  city: string | null;
  /** User's birth year — used for generation variant in V2 training script. */
  birth_year: number | null;
};

export async function getOrCreateProfile(): Promise<Profile> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("getOrCreateProfile requires an authenticated user");
  }

  const { data: existing, error: findError } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (findError) throw findError;
  if (existing) return existing as Profile;

  const { data: inserted, error: insertError } = await supabase
    .from("profiles")
    .insert({
      user_id: user.id,
      display_name: user.email ?? null,
    })
    .select("*")
    .single();

  if (insertError) throw insertError;
  return inserted as Profile;
}
