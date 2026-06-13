"use client";

/**
 * Client wrapper for A4 in the reshape path.
 *
 * Maps PersonalNoteScreen's submit to POST /api/messages/generate with
 * `fromGenerationId`. Under Deferred Audio the route writes the reshaped
 * text as a candidate back onto the SAME generation row and returns
 * `{ candidate: true }`, so on success we route to that row's A6 — which
 * loads the candidate and opens in the candidate state.
 *
 * The /generate schema validates `voiceProfileId`, `category`, and a
 * recipient branch even on the edit-note path (the route reads
 * category/recipient/variant from the prior row, but the request must
 * still satisfy the schema), so the page threads those through from the
 * prior row.
 */
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { PersonalNoteScreen } from "@/components/screens/messages/PersonalNoteScreen";
import type { PersonalNoteSubmitResult } from "@/components/screens/messages/PersonalNoteScreen.types";
import type { MessageCategory } from "@/lib/messageTemplates";
import { messageGenerationRoute } from "@/lib/routes";

interface ReshapeNotePageClientProps {
  generationId: string;
  voiceProfileId: string;
  category: MessageCategory;
  categoryLabel: string;
  recipientName: string;
  initialNote: string;
  // Recipient branch from the prior row — one of these is set; both are
  // forwarded so the /generate schema's "exactly one recipient" holds.
  recipientId: string | null;
  pendingRecipientName: string | null;
  pendingRecipientRelationship: string | null;
}

export function ReshapeNotePageClient({
  generationId,
  voiceProfileId,
  category,
  categoryLabel,
  recipientName,
  initialNote,
  recipientId,
  pendingRecipientName,
  pendingRecipientRelationship,
}: ReshapeNotePageClientProps) {
  const router = useRouter();

  const handleSubmit = useCallback(
    async (note: string | null): Promise<PersonalNoteSubmitResult> => {
      const body: Record<string, unknown> = {
        voiceProfileId,
        category,
        fromGenerationId: generationId,
        ...(note ? { note } : {}),
        ...(recipientId
          ? { recipientId }
          : {
              pendingRecipientName,
              pendingRecipientRelationship,
            }),
      };

      try {
        const res = await fetch("/api/messages/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json().catch(() => ({}))) as { candidate?: boolean };
        if (res.status === 200 && data.candidate) {
          // Candidate written onto this row — return to its A6.
          router.push(messageGenerationRoute(generationId));
          return { ok: true };
        }
      } catch {
        // fall through to not-ok
      }
      return { ok: false };
    },
    [generationId, voiceProfileId, category, recipientId, pendingRecipientName, pendingRecipientRelationship, router],
  );

  const handleBack = useCallback(() => {
    router.push(messageGenerationRoute(generationId));
  }, [generationId, router]);

  return (
    <PersonalNoteScreen
      recipientName={recipientName}
      categoryLabel={categoryLabel}
      category={category}
      initialNote={initialNote}
      onSubmit={handleSubmit}
      onBack={handleBack}
    />
  );
}
