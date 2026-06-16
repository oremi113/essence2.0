import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/profile";
import { redirect } from "next/navigation";
import { SignOutButton } from "./sign-out-button";
import { ROUTES, signInWithNext } from "@/lib/routes";
import { JourneyBeacon } from "@/components/analytics/JourneyBeacon";
import { JOURNEY_EVENTS } from "@/lib/analytics/journey";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(signInWithNext(ROUTES.home));
  }

  const profile = await getOrCreateProfile();

  // New users who haven't completed onboarding are sent to the wizard.
  if (!profile.onboarding_completed_at) {
    redirect(ROUTES.onboarding);
  }

  return (
    <>
      {/*
        Return/retention signal: an authenticated, onboarded app entry. New
        users are redirected to onboarding above, so reaching here is a real
        returning session. Retention = distinct users firing app_opened on a
        day after their signup day (see the analytics note).
      */}
      <JourneyBeacon event={JOURNEY_EVENTS.appOpened} />
      <h1>Home</h1>
      <p>Signed in as {user.email ?? "unknown"}.</p>
      <p>
        <a href={ROUTES.record}>Record training clip</a> (Phase 4: init → upload → commit → playback)
      </p>
      <SignOutButton />
    </>
  );
}
