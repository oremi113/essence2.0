import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/profile";
import { redirect } from "next/navigation";
import { SignOutButton } from "./sign-out-button";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in?next=/home");
  }

  const profile = await getOrCreateProfile();

  // New users who haven't completed onboarding are sent to the wizard.
  if (!profile.onboarding_completed_at) {
    redirect("/onboarding");
  }

  return (
    <>
      <h1>Home</h1>
      <p>Signed in as {user.email ?? "unknown"}.</p>
      <p>
        <a href="/app/record">Record training clip</a> (Phase 4: init → upload → commit → playback)
      </p>
      <SignOutButton />
    </>
  );
}
