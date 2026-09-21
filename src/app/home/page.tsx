import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrCreateProfile, getOrCreateVoiceProfile } from "@/lib/profile";
import { getSubscriptionStatus } from "@/lib/subscription/get-status";
import { STEP6_LIMITS } from "@/lib/messages/cost-controls";
import { redirect } from "next/navigation";
import { HomeBPageClient } from "./HomeBPageClient";
import { HomeAPageClient } from "./HomeAPageClient";
import { deriveHomeAState } from "./deriveHomeAState";
import { RecordPageBannerWrapper } from "@/app/app/record/RecordPageBannerWrapper";
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
  // 25-prompt journey and gets Home A.
  const voiceProfile = await getOrCreateVoiceProfile();

  if (voiceProfile.status !== "ready") {
    // ── Home A ────────────────────────────────────────────────────────────
    // The state table from docs/session-home-a/home-a-critique.md §2.1.
    // Resolving these HERE rather than inside the screen is what collapses
    // Home A from "two states x three directions" to one composition with
    // three registers, only one of which is common.
    const { count } = await supabase
      .from("training_clips")
      .select("id", { count: "exact", head: true })
      .eq("voice_profile_id", voiceProfile.id)
      .eq("status", "uploaded");
    const clipsRecorded = count ?? 0;

    // The §2.1 state table, extracted so it can be tested without walking the
    // app with seeded data (src/app/home/deriveHomeAState.ts).
    const subscription = await getSubscriptionStatus(user.id);
    const state = deriveHomeAState({
      voiceStatus: voiceProfile.status,
      clipsRecorded,
      subscriptionStatus: subscription.status,
      lastFailedAttemptCount: subscription.lastFailedAttemptCount,
      attemptCount: voiceProfile.attempt_count,
      lastAttemptAt: voiceProfile.last_attempt_at,
    });

    if (state.kind === "redirect") {
      redirect(ROUTES.voiceProcessing);
    }

    return (
      <>
        {/*
          Return/retention signal. The spec (docs/analytics/2026-06-16-journey-
          funnel-events.md §4) defines app_opened as firing "on render of /home
          for an authenticated, onboarded user" — not "on Home B". It was only
          wired to the Home B branch, so a user who came back mid-training was
          invisible to the retention metric, which is exactly the behaviour this
          screen exists to encourage. See docs/analytics/2026-09-21-home-a-app-opened.md.
        */}
        <JourneyBeacon event={JOURNEY_EVENTS.appOpened} />
        <HomeAPageClient
          register={state.register}
          clipsRecorded={state.clipsRecorded}
          failedSubState={state.failedSubState}
          retryAt={state.retryAt}
          retryWindowMs={state.retryWindowMs}
          pastDueVariant={state.pastDueVariant}
          banner={
            state.pastDueVariant ? (
              <RecordPageBannerWrapper
                attemptCount={subscription.lastFailedAttemptCount}
              />
            ) : null
          }
        />
      </>
    );
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
