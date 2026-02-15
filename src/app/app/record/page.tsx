import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { buildResolverContext } from "@/lib/voice-training/resolver";
import { RecordingUploadWrapper } from "./RecordingUploadWrapper";
import { RecordPageShell } from "./RecordPageShell";

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
    redirect("/auth/sign-in?next=/app/record");
  }

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
      .select("display_name, city, birth_year")
      .eq("user_id", user.id)
      .maybeSingle();

    return (
      <main style={{ padding: 24 }}>
        <nav style={{ marginBottom: 16, fontSize: 14 }}>
          <a href="/app/shelf">Memory Shelf</a>
          <span style={{ margin: "0 8px", color: "#ccc" }}>|</span>
          <a href="/app/messages/new">New Message</a>
          {voiceProfile && (
            <>
              <span style={{ margin: "0 8px", color: "#ccc" }}>|</span>
              <a href="/app/record">Back to current profile</a>
            </>
          )}
        </nav>
        <RecordPageShell
          mode="create"
          prefill={
            profile
              ? {
                  displayName: profile.display_name ?? undefined,
                  city: profile.city ?? undefined,
                  birthYear: profile.birth_year ?? undefined,
                }
              : undefined
          }
        />
      </main>
    );
  }

  // --- Voice profile exists → build resolver context and show training flow ---
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, city, birth_year")
    .eq("user_id", user.id)
    .single();

  const resolverContext = buildResolverContext(
    profile ?? { display_name: null, city: null, birth_year: null },
    { relationship: voiceProfile.relationship ?? null }
  );

  // Fetch how many prompts are already committed for resume support
  const { count: completedCount } = await supabase
    .from("training_clips")
    .select("id", { count: "exact", head: true })
    .eq("voice_profile_id", voiceProfile.id)
    .eq("status", "uploaded");

  return (
    <main style={{ padding: 24 }}>
      <nav style={{ marginBottom: 16, fontSize: 14 }}>
        <a href="/app/shelf">Memory Shelf</a>
        <span style={{ margin: "0 8px", color: "#ccc" }}>|</span>
        <a href="/app/messages/new">New Message</a>
        <span style={{ margin: "0 8px", color: "#ccc" }}>|</span>
        <a href="/app/record?new=1">Start new voice profile</a>
      </nav>
      <RecordingUploadWrapper
        voiceProfileId={voiceProfile.id}
        voiceProfileStatus={voiceProfile.status}
        resolverContext={resolverContext}
        initialCompletedPrompts={completedCount ?? 0}
      />
    </main>
  );
}
