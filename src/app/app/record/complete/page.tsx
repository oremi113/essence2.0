import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FirstBreathSequence } from "./FirstBreathSequence";

export default async function RecordCompletePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in?next=/app/record/complete");
  }

  const { data: voiceProfile } = await supabase
    .from("voice_profiles")
    .select("id, status")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!voiceProfile) {
    redirect("/app/record");
  }

  if (voiceProfile.status === "archived") {
    redirect("/home");
  }

  if (
    voiceProfile.status === "created" ||
    voiceProfile.status === "failed"
  ) {
    redirect("/app/record");
  }

  return <FirstBreathSequence voiceProfileId={voiceProfile.id} />;
}
