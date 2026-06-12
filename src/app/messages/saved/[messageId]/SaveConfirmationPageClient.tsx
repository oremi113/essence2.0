"use client";

/**
 * Client wrapper for A7 (Save Confirmation).
 *
 * Owns navigation only — the screen is a pure ceremonial close with two
 * CTAs and no server actions. No telemetry fires here: step6.message_saved
 * fires at the A6 save that routed us in, and arriving at A7 adds no V1
 * event (see docs/analytics/2026-06-01-step6-events.md).
 *
 * Interim destination (FOLLOW_UPS #38): the `third` variant's "See what's
 * coming" routes to C1 Three Shaped once it exists; Home until then.
 */
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { SaveConfirmationScreen } from "@/components/screens/messages/SaveConfirmationScreen";
import type { SaveConfirmationVariant } from "@/components/screens/messages/SaveConfirmationScreen.types";
import { ROUTES } from "@/lib/routes";

interface SaveConfirmationPageClientProps {
  recipientName: string;
  variant: SaveConfirmationVariant;
  savedAtIso: string;
}

export function SaveConfirmationPageClient({
  recipientName,
  variant,
  savedAtIso,
}: SaveConfirmationPageClientProps) {
  const router = useRouter();

  const handleViewShelf = useCallback(() => {
    router.push(ROUTES.shelf);
  }, [router]);

  const handleCreateAnother = useCallback(() => {
    router.push(ROUTES.messagesNew);
  }, [router]);

  const handleSeeWhatsComing = useCallback(() => {
    // C1 (Three Shaped) isn't built — Home is the interim landing
    // (FOLLOW_UPS #38).
    router.push(ROUTES.home);
  }, [router]);

  return (
    <SaveConfirmationScreen
      recipientName={recipientName}
      variant={variant}
      savedAtIso={savedAtIso}
      onViewShelf={handleViewShelf}
      onCreateAnother={handleCreateAnother}
      onSeeWhatsComing={handleSeeWhatsComing}
    />
  );
}
