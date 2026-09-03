import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrCreateProfile, getOrCreateVoiceProfile } from "@/lib/profile";
import { getSubscriptionStatus } from "@/lib/subscription/get-status";
import { STEP6_LIMITS } from "@/lib/messages/cost-controls";
import { redirect } from "next/navigation";
import { SignOutButton } from "./sign-out-button";
import { HomeBPageClient } from "./HomeBPageClient";
import { HomeAScreen } from "@/components/screens/home/HomeAScreen";
import type { HomeBVaultState } from "@/components/screens/home/HomeBScreen.types";
import { ROUTES, signInWithNext } from "@/lib/routes";
import { JourneyBeacon } from "@/components/analytics/JourneyBeacon";
import { JOURNEY_EVENTS } from "@/lib/analytics/journey";

type SubscriptionStatusValue = Awaited<
  ReturnType<typeof getSubscriptionStatus>
>["status"];

/**
 * Map the raw subscription status to Home B's calm three-state register
 * (MASTER_SPEC §1.6, §6.3). `past_due` reads as Protected — the vault is still
 * live while Stripe retries; it only becomes "paused" once the retry ceiling
 * is crossed and the webhook writes `lapsed`. `none` shouldn't reach Home B
 * (the arc captures a card before processing), but defaults to trial so a
 * stray state never renders an alarming pill.
 */
function deriveVaultState(status: SubscriptionStatusValue): HomeBVaultState {
  switch (status) {
    case "active":
    case "past_due":
      return "protected";
    case "lapsed":
    case "cancelled":
      return "lapsed";
    case "trial":
    case "none":
    default:
      return "trial";
  }
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
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

  // The home branches on voice-profile status (§6.5, immutable): Home B only
  // appears once the voice is `ready`. Until then the user is still on the
  // 25-prompt journey — Home A (a separate screen/brief, not yet built; the
  // existing stub stands in).
  const voiceProfile = await getOrCreateVoiceProfile();

  if (voiceProfile.status !== "ready") {
    // ── Home A — interim stopgap until its own design brief lands (§6.5). ──
    const isProcessing =
      voiceProfile.status === "processing" || voiceProfile.status === "queued";
    return <HomeAScreen isProcessing={isProcessing} footer={<SignOutButton />} />;
  }

  // ── Home B (the completed-user hub) ──
  const subscription = await getSubscriptionStatus(user.id);
  const { welcome } = await searchParams;

  return (
    <>
      {/*
        Return/retention signal: an authenticated, onboarded app entry into the
        completed-user hub. New users are redirected to onboarding above, so
        reaching here is a real returning session. Retention = distinct users
        firing app_opened on a day after their signup day (see the analytics
        note). Non-visual — sits alongside the Home B hub.
      */}
      <JourneyBeacon event={JOURNEY_EVENTS.appOpened} />
      <HomeBPageClient
        vaultState={deriveVaultState(subscription.status)}
        // First arrival into Home B — set by the first-message → home handoff
        // (`?welcome=1`). The visit-#1 ceremonial beat; every other visit is the
        // calm steady state.
        firstArrival={welcome === "1"}
        maxSaved={STEP6_LIMITS.maxSavedMessages}
      />
    </>
  );
}
