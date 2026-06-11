import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { VoiceCreationView } from "@/components/voice/VoiceCreationView";
import { ROUTES, signInWithNext } from "@/lib/routes";

export default async function VoiceCreatePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(signInWithNext(ROUTES.voiceCreate));
  }

  return (
    <>
      <VoiceCreationView />
    </>
  );
}
