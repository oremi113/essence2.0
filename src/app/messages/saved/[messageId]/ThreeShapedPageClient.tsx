"use client";

/**
 * Client wrapper for C1 (Three Shaped) — the one-time ceremony on the A7 route.
 *
 * Owns navigation + the once-per-device latch. The contract calls for
 * "once per user lifetime"; with no profile flag and the migration lock in
 * place (FOLLOW_UPS #30), V1 uses a localStorage latch — per-device, not truly
 * per-lifetime (a cleared store or a second device can replay the moment;
 * harmless). FOLLOW_UPS #54 tracks the durable profile-flag upgrade.
 *
 * On mount: if the latch is already set (a revisit with a stale ?ceremony
 * param), replace to the bare saved route so the normal A7 confirmation renders
 * instead of replaying the ceremony. Otherwise set the latch and let C1 show.
 * C1 renders unconditionally (SSR + hydration safe — reading localStorage in
 * render/initializer would mismatch). Tradeoff: on the already-seen revisit C1
 * paints briefly (SSR'd HTML + the start of the slow entrance) before the soft
 * nav lands on A7 — not a single frame. Accepted because that revisit (a stale
 * deep-link with ?ceremony) is rare; the COMMON first-time path never flashes
 * (latch unset → no replace → C1 plays straight through).
 *
 * No telemetry: the event catalog has no ceremony event (C1 is silent, like
 * A7); the `from=c1` attribution surfaces when the user joins C2.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ThreeShapedScreen } from "@/components/screens/messages/ThreeShapedScreen";
import { ROUTES, messageSavedRoute } from "@/lib/routes";

const SEEN_KEY = "step6.three_shaped_seen";

export function ThreeShapedPageClient({ messageId }: { messageId: string }) {
  const router = useRouter();

  useEffect(() => {
    let alreadySeen = false;
    try {
      alreadySeen = window.localStorage.getItem(SEEN_KEY) === "1";
      if (!alreadySeen) window.localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // localStorage unavailable (private mode/quota) — fail open: show the
      // ceremony. Better to replay than to swallow a once-in-a-lifetime moment.
    }
    // Already seen → don't replay; fall back to the normal A7 confirmation.
    if (alreadySeen) router.replace(messageSavedRoute(messageId));
  }, [messageId, router]);

  return (
    <ThreeShapedScreen
      onSeeWhatsComing={() => router.push(`${ROUTES.messagesWaitlist}?from=c1`)}
      onBackHome={() => router.push(ROUTES.home)}
    />
  );
}
