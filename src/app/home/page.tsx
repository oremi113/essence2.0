import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrCreateProfile, getOrCreateVoiceProfile } from "@/lib/profile";
import { getSubscriptionStatus } from "@/lib/subscription/get-status";
import { STEP6_LIMITS } from "@/lib/messages/cost-controls";
import { redirect } from "next/navigation";
import { HomeBPageClient } from "./HomeBPageClient";
import { HomeAPageClient } from "./HomeAPageClient";
import { RecordPageBannerWrapper } from "@/app/app/record/RecordPageBannerWrapper";
import { TOTAL_PROMPT_COUNT } from "@/lib/voice-training/script";
import {
  isVoiceProfileRetryAllowed,
  VOICE_PROFILE_MAX_ATTEMPTS,
  VOICE_PROFILE_BACKOFF_MS,
} from "@/lib/voice-training/backoff";
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

    // Nothing left to record -> hand off to the build. Both the "25 clips,
    // not yet building" and "already building" cases go to the SAME place,
    // because that page's guard already fans out correctly (none -> Card
    // Capture, lapsed -> restore, paid -> /start) and never bounces back to
    // /home. Sending 25-clips-unpaid to Card Capture directly is a redirect
    // loop: protect/page.tsx:30 returns any trial/active/past_due user here.
    const building =
      voiceProfile.status === "processing" || voiceProfile.status === "queued";
    if (building || clipsRecorded >= TOTAL_PROMPT_COUNT) {
      redirect(ROUTES.voiceProcessing);
    }

    const subscription = await getSubscriptionStatus(user.id);
    const pastDueVariant =
      subscription.status === "past_due"
        ? (Math.min(Math.max(subscription.lastFailedAttemptCount, 1), 3) as 1 | 2 | 3)
        : null;

    // `failed` is one register with three sub-states, because the retry is
    // capped (3 attempts) and rate-limited. In two of them a "Try again"
    // button would answer 429 — the dead primary this screen is built to
    // avoid — so the sub-state, not just the status, decides what the pinned
    // block holds. See owner-call-failed-register.md.
    let failedSubState: "retryable" | "waiting" | "exhausted" | undefined;
    let retryAt: number | undefined;
    let retryWindowMs: number | undefined;
    if (voiceProfile.status === "failed") {
      const attempts = voiceProfile.attempt_count ?? 0;
      if (attempts >= VOICE_PROFILE_MAX_ATTEMPTS) {
        failedSubState = "exhausted";
      } else if (isVoiceProfileRetryAllowed(attempts, voiceProfile.last_attempt_at)) {
        failedSubState = "retryable";
      } else {
        // Reaching here means a wait is in force, and
        // `isVoiceProfileRetryAllowed` returns true when `last_attempt_at` is
        // null — so it is necessarily set. No clock read during render.
        failedSubState = "waiting";
        retryWindowMs =
          VOICE_PROFILE_BACKOFF_MS[
            Math.min(attempts, VOICE_PROFILE_BACKOFF_MS.length - 1)
          ];
        retryAt = voiceProfile.last_attempt_at
          ? new Date(voiceProfile.last_attempt_at).getTime() + retryWindowMs
          : undefined;
      }
    }

    const register =
      voiceProfile.status === "failed"
        ? "failed"
        : clipsRecorded === 0
          ? "not-started"
          : "paused";

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
        register={register}
        clipsRecorded={clipsRecorded}
        failedSubState={failedSubState}
        retryAt={retryAt}
        retryWindowMs={retryWindowMs}
        pastDueVariant={pastDueVariant}
        banner={
          pastDueVariant ? (
            <RecordPageBannerWrapper attemptCount={subscription.lastFailedAttemptCount} />
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
