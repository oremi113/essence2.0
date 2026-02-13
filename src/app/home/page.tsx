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

  return (
    <main style={{ padding: 24 }}>
      <h1>Home</h1>
      <p>Signed in as {user.email ?? "unknown"}.</p>
      <p>Profile status: {profile.onboarding_state}</p>
      <SignOutButton />
    </main>
  );
}
