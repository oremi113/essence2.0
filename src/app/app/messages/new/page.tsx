import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NewMessageView } from "@/components/messages/NewMessageView";

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
      <nav style={{ marginBottom: 16, fontSize: 14 }}>
        <a href="/app/shelf">Memory Shelf</a>
        <span style={{ margin: "0 8px", color: "#ccc" }}>|</span>
        <a href="/app/record">Record</a>
      </nav>
      <NewMessageView voiceProfiles={profiles ?? []} />
    </>
  );
}
