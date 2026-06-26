import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { RecordScreen } from "@/components/screens/RecordScreen";
import type { RecordScreenData } from "@/components/screens/RecordScreen.types";
import { RecordPageShell } from "./RecordPageShell";
import { RecordPageBannerWrapper } from "./RecordPageBannerWrapper";
import { getSubscriptionStatus } from "@/lib/subscription/get-status";
import { ROUTES, signInWithNext } from "@/lib/routes";

/**
 * Server component for the voice training record page.
 *
 * Modes:
 *   1. No voice profile exists   → show VoiceProfileCreateForm (via client shell)
 *   2. ?new=1 in URL             → show creation form (for starting additional profiles)
 *   3. Voice profile exists      → fetch resolver context + render training flow
 */
export default async function RecordPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const params = await searchParams;
  const forceNewProfile = params?.new === "1";
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(signInWithNext(ROUTES.record));
  }

  // Past-due banner: shown above all record-page content when Stripe's
  // retry cycle is in progress. Variant picked by attempt count.
  const sub = await getSubscriptionStatus(user.id);
  const banner =
    sub.status === "past_due" ? (
      <RecordPageBannerWrapper attemptCount={sub.lastFailedAttemptCount} />
    ) : null;

  // --- Fetch the user's voice profile (most recent, non-archived) ---
  const { data: voiceProfile } = await supabase
    .from("voice_profiles")
    .select("id, status, relationship")
    .eq("user_id", user.id)
    .neq("status", "archived")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // --- No voice profile, or ?new=1 → show creation form ---
  if (!voiceProfile || forceNewProfile) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, display_name, city, birth_year")
      .eq("user_id", user.id)
      .maybeSingle();

    return (
      <>
        {banner}
        <nav style={{ marginBottom: 16, fontSize: 14 }}>
          <a href={ROUTES.shelf}>Memory Shelf</a>
          <span style={{ margin: "0 8px", color: "#ccc" }}>|</span>
          <a href={ROUTES.messagesNew}>New Message</a>
          {voiceProfile && (
            <>
              <span style={{ margin: "0 8px", color: "#ccc" }}>|</span>
              <a href={ROUTES.record}>Back to current profile</a>
            </>
          )}
        </nav>
        <RecordPageShell
          mode="create"
          prefill={
            profile
              ? {
                  // Prefer first_name as the warm, personal {userName}
                  // value. Fall back to display_name for legacy profiles.
                  displayName:
                    profile.first_name ??
                    profile.display_name ??
                    undefined,
                  city: profile.city ?? undefined,
                  birthYear: profile.birth_year ?? undefined,
                }
              : undefined
          }
        />
      </>
    );
  }

  // --- Voice profile exists → build data shuttle for RecordScreen ---
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, display_name, city, birth_year")
    .eq("user_id", user.id)
    .single();

  // Fetch how many prompts are already committed for resume support
  const { count: completedCount } = await supabase
    .from("training_clips")
    .select("id", { count: "exact", head: true })
    .eq("voice_profile_id", voiceProfile.id)
    .eq("status", "uploaded");

  // Already ready — skip training
  if (voiceProfile.status === "ready") {
    redirect(ROUTES.voiceCreate);
  }

  const data: RecordScreenData = {
    clipsRecorded: completedCount ?? 0,
    voiceProfileStatus: voiceProfile.status,
    // first_name is the warm {userName} value used in prompts. For legacy
    // profiles that were created before the column existed, fall back to
    // display_name so the flow never sees a null name.
    displayName: profile?.first_name ?? profile?.display_name ?? null,
    city: profile?.city ?? null,
    birthYear: profile?.birth_year ?? null,
    relationship: voiceProfile.relationship ?? null,
    voiceProfileId: voiceProfile.id,
  };

  return (
    <>
      {banner}
      <RecordScreen data={data} />
    </>
  );
}
