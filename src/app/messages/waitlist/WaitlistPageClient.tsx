"use client";

/**
 * Client wrapper for C2 (Waitlist).
 *
 * Owns the effectful submit + telemetry. POSTs the email to
 * /api/messages/waitlist (idempotent join); on success fires
 * `step6.waitlist_joined` with `surfaced_from` + the feature picks
 * (`features_selected`) — the picks live only in telemetry per the C2
 * data-model decision. Returns the success boolean to the screen, which owns
 * the form↔success transition.
 */
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { WaitlistScreen } from "@/components/screens/messages/WaitlistScreen";
import type { WaitlistSubmission } from "@/components/screens/messages/WaitlistScreen.types";
import { ROUTES } from "@/lib/routes";
import { trackStep6 } from "@/lib/analytics/step6";

export type WaitlistSurfacedFrom = "c1" | "c2_direct" | "c3";

interface WaitlistPageClientProps {
  defaultEmail: string;
  surfacedFrom: WaitlistSurfacedFrom;
}

export function WaitlistPageClient({
  defaultEmail,
  surfacedFrom,
}: WaitlistPageClientProps) {
  const router = useRouter();

  const handleSubmit = useCallback(
    async ({ email, features }: WaitlistSubmission): Promise<boolean> => {
      try {
        const res = await fetch("/api/messages/waitlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, source: surfacedFrom }),
        });
        if (!res.ok) return false;
        trackStep6("waitlist_joined", {
          surfaced_from: surfacedFrom,
          features_selected: features,
        });
        return true;
      } catch {
        return false;
      }
    },
    [surfacedFrom],
  );

  const handleBackHome = useCallback(() => {
    router.push(ROUTES.home);
  }, [router]);

  return (
    <WaitlistScreen
      defaultEmail={defaultEmail}
      onSubmit={handleSubmit}
      onBackHome={handleBackHome}
    />
  );
}
