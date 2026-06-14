'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { MessageCreationFlow } from '@/components/screens/messages/MessageCreationFlow';
import { clearFlowId } from '@/lib/analytics/step6';
import type { PersonalNoteSubmitResult } from '@/components/screens/messages/PersonalNoteScreen.types';
import type { ExistingRecipient } from '@/components/screens/messages/RecipientSetupScreen.types';
import { ROUTES } from '@/lib/routes';

/**
 * Client wrapper for /messages/new. Provides router-driven exit and
 * clears the active flow_id when the user backs out of the flow.
 *
 * onGenerate (A4 submit handoff) is a stub for now: the forward cold-
 * start /generate call needs the user's voiceProfileId (a page-side
 * fetch) and resolves the "A5 wait vs A6 preview" landing — that is the
 * A4→A5 forward-wiring chunk. Until then it resolves not-ok so A4 never
 * dead-ends. See docs/FOLLOW_UPS.md (A3 chunk: forward /generate wiring).
 */

interface MessagesNewPageClientProps {
  existingRecipients: ExistingRecipient[];
}

export function MessagesNewPageClient({
  existingRecipients,
}: MessagesNewPageClientProps) {
  const router = useRouter();

  const handleExit = useCallback(() => {
    clearFlowId();
    router.push(ROUTES.home);
  }, [router]);

  const handleGenerate = useCallback(
    async (): Promise<PersonalNoteSubmitResult> => {
      // Placeholder until the A4→A5 chunk wires the cold-start /generate
      // call + the generation-route push.
      console.warn(
        '[messages/new] forward /generate not yet wired (A4→A5 chunk)',
      );
      return { ok: false };
    },
    [],
  );

  return (
    <MessageCreationFlow
      existingRecipients={existingRecipients}
      onExitFlow={handleExit}
      onGenerate={handleGenerate}
    />
  );
}
