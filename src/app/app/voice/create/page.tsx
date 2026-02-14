import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { VoiceCreationView } from "@/components/voice/VoiceCreationView";

export default async function VoiceCreatePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/sign-in?next=/app/voice/create");
  }

  return (
    <main style={{ padding: 24 }}>
      <VoiceCreationView />
    </main>
  );
}
