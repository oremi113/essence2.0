import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NewMessageView } from "@/components/messages/NewMessageView";
import { TabNav } from "@/components/nav/TabNav";

export default async function NewMessagePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/sign-in?next=/app/messages/new");
  }

  // Fetch voice profiles that are ready
  const { data: profiles } = await supabase
    .from("voice_profiles")
    .select("id, label, status")
    .eq("user_id", user.id)
    .eq("status", "ready")
    .order("created_at", { ascending: false });

  return (
    <>
      <TabNav current="new-message" />
      <NewMessageView voiceProfiles={profiles ?? []} />
    </>
  );
}
