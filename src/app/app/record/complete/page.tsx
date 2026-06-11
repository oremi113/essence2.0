import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FirstBreathSequence } from "@/components/screens/FirstBreathSequence";
import { ROUTES, signInWithNext } from "@/lib/routes";

export default async function RecordCompletePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(signInWithNext(ROUTES.recordComplete));
  }

  const { data: voiceProfile } = await supabase
    .from("voice_profiles")
    .select("id, status")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!voiceProfile) {
    redirect(ROUTES.record);
  }

  if (voiceProfile.status === "archived") {
    redirect(ROUTES.home);
  }

  if (
    voiceProfile.status === "created" ||
    voiceProfile.status === "failed"
  ) {
    redirect(ROUTES.record);
  }

  return <FirstBreathSequence voiceProfileId={voiceProfile.id} />;
}
