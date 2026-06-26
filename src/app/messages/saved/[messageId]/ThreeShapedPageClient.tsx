"use client";

/**
 * Client wrapper for C1 (Three Shaped) — the one-time ceremony on the A7 route.
 *
 * Owns navigation + stamps the durable once-per-lifetime flag. The "once per
 * user lifetime" contract is now enforced server-side (FOLLOW_UPS #54): the A7
 * page only renders this wrapper when profiles.three_shaped_ceremony_seen_at is
 * NULL, so an already-seen user (any device) never reaches C1 — no flash,
 * no client-side replace. On mount we call the page-owned `onSeen` server
 * action once to stamp the flag; the DB write is idempotent (preserves the
 * first-show timestamp), and stamping is fire-and-forget — if it fails the only
 * cost is replaying a warm, no-cost ceremony, same as the prior latch.
 *
 * This replaces the V1 per-device localStorage latch ("step6.three_shaped_seen"),
 * which couldn't guarantee per-lifetime (a cleared store or a second device
 * replayed the moment).
 *
 * No telemetry: the event catalog has no ceremony event (C1 is silent, like
 * A7); the `from=c1` attribution surfaces when the user joins C2.
 */
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ThreeShapedScreen } from "@/components/screens/messages/ThreeShapedScreen";
import { ROUTES } from "@/lib/routes";

export function ThreeShapedPageClient({ onSeen }: { onSeen: () => Promise<void> }) {
  const router = useRouter();
  const stamped = useRef(false);

  useEffect(() => {
    // Guard against React 18 StrictMode's double-invoked effect (dev) and any
    // re-render — the durable stamp should be attempted exactly once per mount.
    if (stamped.current) return;
    stamped.current = true;
    void onSeen();
  }, [onSeen]);

  return (
    <ThreeShapedScreen
      onSeeWhatsComing={() => router.push(`${ROUTES.messagesWaitlist}?from=c1`)}
      onBackHome={() => router.push(ROUTES.home)}
    />
  );
}
