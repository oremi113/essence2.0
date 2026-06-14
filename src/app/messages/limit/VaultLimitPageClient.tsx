"use client";

/**
 * Client wrapper for C3 (Vault Limit Reached).
 *
 * Owns navigation + the one surface event. `step6.vault_limit_blocked` fires
 * once on mount (the C3 surface is the trigger per the analytics catalog,
 * event #13), carrying `surfaced_from` so we can split the A2-entry gate
 * from the /save race-case. No server actions — the cap is a settled state.
 */
import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { VaultLimitScreen } from "@/components/screens/messages/VaultLimitScreen";
import { ROUTES } from "@/lib/routes";
import { trackStep6, clearFlowId } from "@/lib/analytics/step6";

export type VaultLimitSurfacedFrom = "a2_entry" | "save_race";

interface VaultLimitPageClientProps {
  surfacedFrom: VaultLimitSurfacedFrom;
}

export function VaultLimitPageClient({ surfacedFrom }: VaultLimitPageClientProps) {
  const router = useRouter();
  const fired = useRef(false);

  // Surface event — once per mount. React 18 StrictMode double-invokes
  // effects in dev; the ref guards against a duplicate emit.
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackStep6("vault_limit_blocked", { surfaced_from: surfacedFrom });
    // Reaching the ceiling ends any in-flight creation flow (the save-race
    // path still had an active flow_id). Clear it so the next attempt mints
    // a fresh one.
    clearFlowId();
  }, [surfacedFrom]);

  const handleVisitShelf = useCallback(() => {
    router.push(ROUTES.shelf);
  }, [router]);

  const handleSeeWhatsComing = useCallback(() => {
    // → C2 Waitlist, attributed to the C3 surface (FOLLOW_UPS #52 resolved).
    router.push(`${ROUTES.messagesWaitlist}?from=c3`);
  }, [router]);

  return (
    <VaultLimitScreen
      onVisitShelf={handleVisitShelf}
      onSeeWhatsComing={handleSeeWhatsComing}
    />
  );
}
