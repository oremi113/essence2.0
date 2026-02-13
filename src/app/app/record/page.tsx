import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrCreateVoiceProfile } from "@/lib/voice-profile";
import { redirect } from "next/navigation";
import { RecordingUploadWrapper } from "./RecordingUploadWrapper";

export default async function RecordPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/sign-in?next=/app/record");
  }

  const { data: profiles } = await supabase
    .from("voice_profiles")
    .select("id")
    .eq("user_id", user.id)
    .limit(10);

  const voiceProfiles =
    profiles?.length
      ? profiles
      : [{ id: (await getOrCreateVoiceProfile()).id }];

  return (
    <main style={{ padding: 24 }}>
      <h1>Record training clip</h1>
      <p>Record audio and upload directly to storage, then commit metadata.</p>
      <RecordingUploadWrapper voiceProfiles={voiceProfiles} />
    </main>
  );
}
